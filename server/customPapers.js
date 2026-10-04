import fs from 'fs'
import path from 'path'

// Papers added via the "+ Add Paper" admin UI, stored separately from the hand-curated
// data/papers.json corpus so quick additions don't silently mix into the reviewed set.
// Bind-mounted in docker-compose.yml (like auth.js's .env-backed user store) so entries
// survive image rebuilds.
const STORE_PATH = process.env.CUSTOM_PAPERS_PATH || path.join(process.cwd(), 'custom-papers.json')

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'))
  } catch {
    return []
  }
}

function writeAll(list) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(list, null, 2) + '\n')
}

export function listCustomPapers() {
  return readAll()
}

export function addCustomPaper(paper) {
  const all = readAll()
  all.push(paper)
  writeAll(all)
  return paper
}

export function nextMainId(basePapers) {
  const ids = [...basePapers.map(p => p.id), ...readAll().map(p => p.id)]
  return ids.length ? Math.max(...ids) + 1 : 1
}
