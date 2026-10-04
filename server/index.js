import express from 'express'
import session from 'express-session'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  loadStore,
  ensureSessionSecret,
  findUserByEmail,
  listUsers,
  createUser,
  verifyPassword,
  changePassword,
  deleteUser,
  bootstrapAdmin,
} from './auth.js'
import { getAppData } from './appData.js'
import { loadPdfIndex, getPdfPath } from './papers.js'
import { addCustomPaper, nextMainId } from './customPapers.js'
import { DATA_DIR, loadConfig, loadData, loadDomains } from './data.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 4000

loadStore()
await bootstrapAdmin()
const secret = ensureSessionSecret()
loadData() // fail fast on malformed JSON instead of on the first request
console.log(`Loaded corpus data from ${DATA_DIR}`)
const pdfCount = loadPdfIndex()
console.log(`Indexed ${pdfCount} paper PDFs`)

const app = express()
app.set('trust proxy', 1)
app.use(express.json())

app.use(
  session({
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 1000 * 60 * 60 * 12,
    },
  })
)

// Simple in-memory brute-force guard (small internal tool, single process — no external store needed)
const failedAttempts = new Map()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

function isLocked(email) {
  const rec = failedAttempts.get(email)
  if (!rec) return false
  if (Date.now() - rec.first > WINDOW_MS) {
    failedAttempts.delete(email)
    return false
  }
  return rec.count >= MAX_ATTEMPTS
}
function recordFailure(email) {
  const rec = failedAttempts.get(email)
  if (!rec || Date.now() - rec.first > WINDOW_MS) {
    failedAttempts.set(email, { count: 1, first: Date.now() })
  } else {
    rec.count += 1
  }
}
function clearFailures(email) {
  failedAttempts.delete(email)
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' })
  next()
}
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }
  const normalized = email.trim().toLowerCase()
  if (isLocked(normalized)) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' })
  }
  const user = findUserByEmail(normalized)
  const ok = user && (await verifyPassword(user, password))
  if (!ok) {
    recordFailure(normalized)
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  clearFailures(normalized)
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Login failed, please try again' })
    req.session.user = { email: user.email, role: user.role }
    res.json(req.session.user)
  })
})

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(req.session.user)
})

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' })
  }
  const user = findUserByEmail(req.session.user.email)
  const ok = user && (await verifyPassword(user, currentPassword || ''))
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' })
  await changePassword(user.email, newPassword)
  res.json({ ok: true })
})

// Branding only (title/icon) — public so the login screen can show it before sign-in.
app.get('/api/config', (req, res) => {
  const { title, subtitle, icon } = loadConfig()
  res.json({ title, subtitle, icon })
})

app.get('/api/app-data', requireAuth, (req, res) => {
  res.json(getAppData())
})

app.get('/api/papers/:id/pdf', requireAuth, (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Invalid paper id' })
  const pdfPath = getPdfPath(req.params.id)
  if (!pdfPath) return res.status(404).json({ error: 'No PDF for this paper' })
  res.download(pdfPath)
})

app.post('/api/papers', requireAdmin, (req, res) => {
  const b = req.body || {}
  const domain = Number(b.domain)
  if (!loadDomains().some(d => d.id === domain)) {
    return res.status(400).json({ error: 'domain must match an id in domains.json' })
  }
  if (!b.title || !b.authors || !b.venue || !b.year) {
    return res.status(400).json({ error: 'title, authors, venue, and year are required' })
  }
  const year = Number(b.year)
  if (!Number.isInteger(year)) {
    return res.status(400).json({ error: 'year must be a number' })
  }

  const score = Number(b.score)
  if (!Number.isInteger(score) || score < 1 || score > 10) {
    return res.status(400).json({ error: 'score must be an integer 1-10' })
  }
  const id = nextMainId(loadData().papers)
  const paper = {
    id, num: String(id).padStart(2, '0'), domain, score,
    caution: !!b.caution,
    title: b.title, authors: b.authors, venue: b.venue, year,
    doi: b.doi || undefined,
    what: b.what || '', how: b.how || '', results: b.results || '', usage: b.usage || '',
    tags: Array.isArray(b.tags) ? b.tags : [],
  }
  addCustomPaper(paper)
  res.status(201).json(paper)
})

app.get('/api/users', requireAdmin, (req, res) => {
  res.json(listUsers())
})

app.post('/api/users', requireAdmin, async (req, res) => {
  const { email, password, role } = req.body || {}
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email is required' })
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  try {
    const created = await createUser(email, password, role)
    res.status(201).json(created)
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message })
  }
})

app.delete('/api/users/:email', requireAdmin, async (req, res) => {
  const targetEmail = decodeURIComponent(req.params.email).trim()
  const target = findUserByEmail(targetEmail)
  if (!target) return res.status(404).json({ error: 'User not found' })

  if (target.email.toLowerCase() === req.session.user.email.toLowerCase()) {
    return res.status(400).json({ error: 'Cannot delete your own account while signed in' })
  }
  if (target.role === 'admin') {
    const otherAdmins = listUsers().filter(
      (u) => u.role === 'admin' && u.email.toLowerCase() !== target.email.toLowerCase()
    )
    if (otherAdmins.length === 0) {
      return res.status(400).json({ error: 'Cannot delete the last remaining admin account' })
    }
  }
  try {
    await deleteUser(targetEmail)
    res.json({ ok: true })
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message })
  }
})

const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' })
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`literature-review-tracker listening on port ${PORT}`)
})
