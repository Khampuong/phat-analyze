import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { config } from './config.js'

// Accept the previous and next 30-second step as well, to allow for clock drift between phone and server.
authenticator.options = { window: 1 }

export const generateTotpSecret = () => authenticator.generateSecret()

export async function buildQrCode(secret, email) {
  const otpauthUrl = authenticator.keyuri(email, config.twofaIssuer, secret)
  return { otpauthUrl, qrCodeDataUrl: await QRCode.toDataURL(otpauthUrl) }
}

// Returns the 30-second time step the code belongs to, or null if the code is wrong.
// The caller stores the step and rejects any code from the same or an earlier step,
// so a code someone saw over your shoulder can't be used a second time.
export function matchTotpStep(secret, code) {
  const token = String(code || '').replace(/\s+/g, '')
  if (!/^\d{6}$/.test(token)) return null
  const delta = authenticator.checkDelta(token, secret)
  if (delta === null) return null
  return Math.floor(Date.now() / 1000 / authenticator.allOptions().step) + delta
}
