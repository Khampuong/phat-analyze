import { config } from './config.js'
import { loadData } from './data.js'

// "Discover" tab: finds candidate papers with the Perplexity Search API, then looks each hit up in
// Crossref. Perplexity only supplies the hit (title, URL, snippet); authors, venue, year and DOI
// come from Crossref, so nothing bibliographic is ever taken from generated text. Hits Crossref
// cannot match are returned with verified: false and must be checked by hand.

const DOI_PATTERN = /10\.\d{4,9}\/[^\s"<>?#]+/
const SNIPPET_LENGTH = 400

function upstreamError(message, status = 502) {
  const err = new Error(message)
  err.status = status
  return err
}

async function getJson(url, options, what) {
  let res
  try {
    res = await fetch(url, options)
  } catch (e) {
    throw upstreamError(`${what} could not be reached (${e.name === 'TimeoutError' ? 'timed out' : e.message})`)
  }
  if (!res.ok) {
    const err = upstreamError(`${what} answered with HTTP ${res.status}`)
    err.upstreamStatus = res.status
    throw err
  }
  return res.json()
}

const tokens = (s) => String(s || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []
const normalizeTitle = (s) => tokens(s).join(' ')
const normalizeDoi = (s) => String(s || '').toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '').trim()

// Search hits carry site suffixes ("… - ScienceDirect"), so test whether the Crossref title is
// contained in the hit's title rather than comparing the two for equality.
function titlesMatch(crossrefTitle, hitTitle) {
  const wanted = tokens(crossrefTitle)
  if (wanted.length < 4) return false
  const have = new Set(tokens(hitTitle))
  return wanted.filter((t) => have.has(t)).length / wanted.length >= 0.85
}

function doiFromUrl(url) {
  let decoded = url
  try {
    decoded = decodeURIComponent(url)
  } catch {}
  const match = decoded.match(DOI_PATTERN)
  return match ? match[0].replace(/[.,;)]+$/, '') : ''
}

function formatAuthors(authors = []) {
  const names = authors.map((a) => a.family || a.name || '').filter(Boolean)
  if (!names.length) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  return `${names[0]} et al.`
}

function fromCrossref(work) {
  return {
    title: work.title?.[0] || '',
    authors: formatAuthors(work.author),
    venue: work['container-title']?.[0] || work.publisher || '',
    year: work.issued?.['date-parts']?.[0]?.[0] ?? null,
    doi: normalizeDoi(work.DOI),
  }
}

const crossrefOptions = () => ({
  headers: { 'User-Agent': 'literature-review-tracker (Discover tab)' },
  signal: AbortSignal.timeout(10_000),
})

// Returns Crossref metadata for a hit, or null when Crossref has no confident match.
async function lookUp(hit) {
  const doi = doiFromUrl(hit.url)
  try {
    if (doi) {
      const byDoi = await getJson(`${config.crossrefApiUrl}/works/${encodeURIComponent(doi)}`, crossrefOptions(), 'Crossref')
      if (byDoi.message?.title?.[0]) return fromCrossref(byDoi.message)
    }
  } catch {
    // A DOI-shaped string in a URL is often not a real DOI; fall through to the title search.
  }
  try {
    const query = new URLSearchParams({ 'query.bibliographic': hit.title, rows: '1' })
    const byTitle = await getJson(`${config.crossrefApiUrl}/works?${query}`, crossrefOptions(), 'Crossref')
    const work = byTitle.message?.items?.[0]
    if (work && titlesMatch(work.title?.[0], hit.title)) return fromCrossref(work)
  } catch {
    // Crossref being down must not lose the search results; they come back unverified.
  }
  return null
}

async function searchPerplexity(query) {
  const body = { query, max_results: 10, max_tokens_per_page: 256 }
  if (config.perplexityDomainFilter.length) body.search_domain_filter = config.perplexityDomainFilter
  let data
  try {
    data = await getJson(
      `${config.perplexityApiUrl}/search`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.perplexityApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      },
      'Perplexity'
    )
  } catch (e) {
    if (e.upstreamStatus === 401) throw upstreamError('Perplexity rejected the API key. Check PERPLEXITY_API_KEY.')
    if (e.upstreamStatus === 429) throw upstreamError('Perplexity rate limit or credit limit reached. Try again later.')
    throw e
  }
  return Array.isArray(data.results) ? data.results : []
}

export const discoverEnabled = () => !!config.perplexityApiKey

export async function discoverPapers(query) {
  if (!discoverEnabled()) throw upstreamError('Perplexity is not configured. Set PERPLEXITY_API_KEY and restart.', 503)
  const hits = (await searchPerplexity(query)).filter((h) => h?.title && h?.url)
  const { papers, rejected } = loadData()
  const known = (items) => ({
    dois: new Set(items.map((p) => normalizeDoi(p.doi)).filter(Boolean)),
    titles: new Set(items.map((p) => normalizeTitle(p.title))),
  })
  const inPapers = known(papers)
  const inRejected = known(rejected)

  const results = await Promise.all(
    hits.map(async (hit) => {
      const meta = await lookUp(hit)
      const result = {
        title: meta?.title || hit.title,
        authors: meta?.authors || '',
        venue: meta?.venue || '',
        year: meta?.year ?? (Number(String(hit.date || '').slice(0, 4)) || null),
        doi: meta?.doi || '',
        url: hit.url,
        snippet: String(hit.snippet || '').replace(/\s+/g, ' ').trim().slice(0, SNIPPET_LENGTH),
        verified: !!meta,
      }
      const title = normalizeTitle(result.title)
      const seenIn = (set) => (result.doi && set.dois.has(result.doi)) || set.titles.has(title)
      result.known = seenIn(inPapers) ? 'paper' : seenIn(inRejected) ? 'rejected' : null
      return result
    })
  )
  // The same paper is often indexed on several sites.
  const seen = new Set()
  return results.filter((r) => {
    const key = r.doi || normalizeTitle(r.title)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
