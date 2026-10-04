import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

// Users + session secret, stored as KEY=value lines. Overridable so Docker can keep it in a
// mounted state directory instead of inside the container.
const ENV_PATH = process.env.AUTH_ENV_PATH || path.join(process.cwd(), '.env')

function readEnvLines() {
  if (!fs.existsSync(ENV_PATH)) return []
  return fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)
}

function writeEnvLines(lines) {
  const trimmed = [...lines]
  while (trimmed.length && trimmed[trimmed.length - 1] === '') trimmed.pop()
  fs.writeFileSync(ENV_PATH, trimmed.join('\n') + '\n', { mode: 0o600 })
}

function appendLines(newLines) {
  writeEnvLines([...readEnvLines(), ...newLines])
}

function rewriteKey(key, value) {
  const lines = readEnvLines()
  let found = false
  const next = lines.map((line) => {
    const m = line.match(/^([A-Z0-9_]+)=/)
    if (m && m[1] === key) {
      found = true
      return `${key}=${value}`
    }
    return line
  })
  if (!found) next.push(`${key}=${value}`)
  writeEnvLines(next)
}

function parseEnv(lines) {
  const env = {}
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

let users = []
let sessionSecret = null

export function loadStore() {
  const env = parseEnv(readEnvLines())
  users = []
  let i = 1
  while (env[`APP_USER_${i}_EMAIL`]) {
    users.push({
      index: i,
      email: env[`APP_USER_${i}_EMAIL`],
      passwordHash: env[`APP_USER_${i}_PASSWORD_HASH`],
      role: env[`APP_USER_${i}_ROLE`] === 'admin' ? 'admin' : 'user',
    })
    i++
  }
  sessionSecret = env.SESSION_SECRET || null
}

// First-run setup: with no users yet, create an admin from ADMIN_EMAIL/ADMIN_PASSWORD so a fresh
// install can be signed into. Ignored once any user exists, so the env vars can be removed afterwards.
export async function bootstrapAdmin() {
  if (users.length) return
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('No users exist yet — set ADMIN_EMAIL and ADMIN_PASSWORD to create the first admin.')
    return
  }
  if (ADMIN_PASSWORD.length < 8) {
    console.warn('ADMIN_PASSWORD must be at least 8 characters — first admin was not created.')
    return
  }
  await createUser(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')
  console.log(`Created first admin account: ${ADMIN_EMAIL}`)
}

export function ensureSessionSecret() {
  if (sessionSecret) return sessionSecret
  sessionSecret = crypto.randomBytes(32).toString('hex')
  appendLines([`SESSION_SECRET=${sessionSecret}`])
  return sessionSecret
}

export function findUserByEmail(email) {
  const norm = email.trim().toLowerCase()
  return users.find((u) => u.email.toLowerCase() === norm)
}

export function listUsers() {
  return users.map(({ email, role }) => ({ email, role }))
}

export async function verifyPassword(user, password) {
  if (!user || !user.passwordHash) return false
  return bcrypt.compare(password, user.passwordHash)
}

export async function createUser(email, password, role) {
  const clean = email.trim()
  if (findUserByEmail(clean)) {
    const err = new Error('A user with that email already exists')
    err.status = 409
    throw err
  }
  const hash = await bcrypt.hash(password, 10)
  const index = users.length ? Math.max(...users.map((u) => u.index)) + 1 : 1
  const user = { index, email: clean, passwordHash: hash, role: role === 'admin' ? 'admin' : 'user' }
  users.push(user)
  appendLines([
    `APP_USER_${index}_EMAIL=${clean}`,
    `APP_USER_${index}_PASSWORD_HASH=${hash}`,
    `APP_USER_${index}_ROLE=${user.role}`,
  ])
  return { email: user.email, role: user.role }
}

export async function deleteUser(email) {
  const user = findUserByEmail(email)
  if (!user) {
    const err = new Error('User not found')
    err.status = 404
    throw err
  }
  const prefix = `APP_USER_${user.index}_`
  const next = readEnvLines().filter((line) => !line.startsWith(prefix))
  writeEnvLines(next)
  users = users.filter((u) => u.index !== user.index)
  return { email: user.email }
}

export async function changePassword(email, newPassword) {
  const user = findUserByEmail(email)
  if (!user) {
    const err = new Error('User not found')
    err.status = 404
    throw err
  }
  const hash = await bcrypt.hash(newPassword, 10)
  user.passwordHash = hash
  rewriteKey(`APP_USER_${user.index}_PASSWORD_HASH`, hash)
}
