<script>
  import { onMount } from 'svelte'
  import { discoverStatus, discoverPapers, saveCollection } from '../auth.js'

  export let appData
  // Re-fetches /api/app-data so every view shows what was just saved.
  export let refresh

  $: ({ domains, papers, rejected } = appData)

  let domainId = appData.domains[0]?.id ?? null
  let query = ''
  let results = []
  let searched = ''
  let loading = false
  let error = ''
  let notice = ''
  let busyUrl = ''
  // Keyed by result URL. Replaced as whole objects (never mutated) so the {#each} rows update.
  let scores = {}
  let reasons = {}

  $: domain = domains.find((d) => d.id === domainId)

  // null = still checking. Without a key the search controls stay off instead of failing on click.
  let enabled = null
  onMount(async () => {
    try {
      enabled = (await discoverStatus()).enabled
    } catch (e) {
      error = e.message
    }
  })

  async function search(text = query) {
    query = text
    const q = query.trim()
    if (q.length < 3) {
      error = 'Type at least 3 characters to search.'
      return
    }
    loading = true
    error = ''
    notice = ''
    try {
      results = (await discoverPapers(q)).results
      searched = q
    } catch (e) {
      error = e.message
    } finally {
      loading = false
    }
  }

  const hostname = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  }

  const mark = (url, known) => (results = results.map((r) => (r.url === url ? { ...r, known } : r)))

  async function save(result, name, value, known, message) {
    busyUrl = result.url
    error = ''
    notice = ''
    try {
      await saveCollection(name, value)
      await refresh()
      mark(result.url, known)
      notice = message
    } catch (e) {
      error = e.message
    } finally {
      busyUrl = ''
    }
  }

  function accept(r) {
    const id = Math.max(0, ...papers.map((p) => p.id)) + 1
    const paper = {
      id,
      domain: domainId,
      score: Number(scores[r.url] ?? 5),
      // Crossref could not confirm this one, so it is flagged until the details are checked by hand.
      caution: !r.verified,
      title: r.title,
      authors: r.authors || 'Unknown',
      venue: r.venue || hostname(r.url) || 'Unknown',
      year: r.year || new Date().getFullYear(),
      doi: r.doi,
      what: r.snippet,
      how: '',
      results: '',
      usage: '',
      tags: [{ label: 'Found via Perplexity', type: '' }, ...(r.verified ? [] : [{ label: 'Metadata unverified', type: 'warn' }])],
    }
    return save(r, 'papers', [...papers, paper], 'paper', `Added as paper #${String(id).padStart(2, '0')} in D${domainId}. Fill in the notes under Manage Data.`)
  }

  function reject(r) {
    const nums = rejected.map((p) => Number(String(p.id).replace('x', ''))).filter(Number.isInteger)
    const item = {
      id: `x${Math.max(0, ...nums) + 1}`,
      status: 'rejected',
      batch: new Date().toISOString().slice(0, 7),
      title: r.title,
      authors: r.authors,
      venue: r.venue || hostname(r.url),
      year: r.year,
      reason: (reasons[r.url] || '').trim() || `Screened out from search "${searched}"`,
    }
    return save(r, 'rejected', [...rejected, item], 'rejected', 'Recorded under Rejected Papers.')
  }
</script>

<section class="manage discover">
  <p class="intro">
    Search with Perplexity, then check each hit against Crossref. Authors, venue, year and DOI come from Crossref;
    hits it cannot confirm are marked <strong>unverified</strong> and are added with the “cite with caution” flag.
  </p>

  <div class="bar">
    <select bind:value={domainId} aria-label="Domain">
      {#each domains as d}
        <option value={d.id}>D{d.id} — {d.label}</option>
      {/each}
    </select>
    <input
      type="text"
      placeholder="Search text, or pick one of the domain's keywords below"
      bind:value={query}
      on:keydown={(e) => e.key === 'Enter' && enabled && search()}
    />
    <button class="btn primary" on:click={() => search()} disabled={loading || !enabled}>{loading ? 'Searching…' : 'Search'}</button>
  </div>

  {#if domain?.keywords?.length}
    <div class="keywords">
      {#each domain.keywords as k}
        <button class="chip" on:click={() => search(k)} disabled={loading || !enabled}>{k}</button>
      {/each}
    </div>
  {/if}

  {#if enabled === false}
    <div class="msg error">Perplexity is not configured. Add PERPLEXITY_API_KEY to .env and restart the app to turn search on.</div>
  {/if}
  {#if error}<div class="msg error">{error}</div>{/if}
  {#if notice}<div class="msg ok">{notice}</div>{/if}

  {#if searched && !loading}
    <div class="muted">{results.length} result{results.length === 1 ? '' : 's'} for “{searched}”</div>
  {/if}

  {#each results as r (r.url)}
    <article class="hit" class:done={r.known}>
      <div class="hit-head">
        <a class="hit-title" href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a>
        {#if r.known === 'paper'}
          <span class="badge in">In corpus</span>
        {:else if r.known === 'rejected'}
          <span class="badge out">Rejected</span>
        {:else if r.verified}
          <span class="badge ok">Crossref verified</span>
        {:else}
          <span class="badge caution">Unverified</span>
        {/if}
      </div>
      <div class="meta">
        {[r.authors, r.venue, r.year].filter(Boolean).join(' · ') || hostname(r.url)}
        {#if r.doi}· <a href="https://doi.org/{r.doi}" target="_blank" rel="noopener noreferrer">{r.doi}</a>{/if}
      </div>
      {#if r.snippet}<p class="snippet">{r.snippet}</p>{/if}

      {#if !r.known}
        <div class="actions">
          <label class="score">
            Relevance
            <input
              type="number" min="1" max="10"
              value={scores[r.url] ?? 5}
              on:input={(e) => (scores = { ...scores, [r.url]: e.target.value })}
            />
          </label>
          <button class="btn primary" on:click={() => accept(r)} disabled={busyUrl === r.url || !domainId}>
            Add to D{domainId}
          </button>
          <input
            class="reason" type="text" placeholder="Reason for rejecting (optional)"
            value={reasons[r.url] ?? ''}
            on:input={(e) => (reasons = { ...reasons, [r.url]: e.target.value })}
          />
          <button class="btn ghost-danger" on:click={() => reject(r)} disabled={busyUrl === r.url}>Reject</button>
        </div>
      {/if}
    </article>
  {/each}
</section>

<style>
  .discover { display: flex; flex-direction: column; gap: 12px; max-width: 1000px; }
  .intro { font-size: 0.8rem; color: var(--text2); line-height: 1.55; }
  .bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .bar input, .bar select, .actions input {
    padding: 6px 10px; background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text); font-size: 0.82rem; outline: none;
  }
  .bar input { flex: 1; min-width: 220px; }
  .bar input:focus, .bar select:focus, .actions input:focus { border-color: var(--accent); }
  .keywords { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip {
    padding: 3px 10px; font-size: 0.74rem; color: var(--text2); background: var(--surface2);
    border: 1px solid var(--border); border-radius: 999px; cursor: pointer;
  }
  .chip:hover { border-color: var(--accent); color: var(--text); }
  .chip:disabled { opacity: 0.6; cursor: not-allowed; }
  .muted { color: var(--text3); font-size: 0.74rem; }
  .hit {
    display: flex; flex-direction: column; gap: 6px; padding: 12px 14px;
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius2);
  }
  .hit.done { opacity: 0.65; }
  .hit-head { display: flex; gap: 10px; align-items: flex-start; justify-content: space-between; }
  .hit-title { font-size: 0.9rem; font-weight: 600; color: var(--text); text-decoration: none; overflow-wrap: anywhere; }
  .hit-title:hover { color: var(--accent); }
  .meta { font-size: 0.76rem; color: var(--text2); overflow-wrap: anywhere; }
  .meta a { color: var(--accent); }
  .snippet { font-size: 0.78rem; color: var(--text2); line-height: 1.5; }
  .badge { white-space: nowrap; }
  .badge.ok, .badge.in { background: var(--success-bg); color: var(--success); border: 1px solid var(--success-border); }
  .badge.out { background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger-border); }
  .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 4px; }
  .score { display: flex; gap: 6px; align-items: center; font-size: 0.74rem; color: var(--text3); }
  .score input { width: 56px; }
  .reason { flex: 1; min-width: 180px; }
</style>
