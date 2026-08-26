import type { IncomingMessage, ServerResponse } from 'http'
import { isIP } from 'net'

const COOKIE_NAME = '__tunnel_token'

/** Connect request after Vite may have rewritten `url` for an HTML navigation. */
type GatedRequest = IncomingMessage & { originalUrl?: string }

/**
 * URL the client actually requested. Vite's HTML middleware rewrites `req.url` to `/index.html`
 * for `Accept: text/html` navigations and drops the query string; Connect keeps the original on
 * `originalUrl`. Curl sends a wildcard Accept header and never takes that path, which is why curl
 * can 200 while Chrome/Safari 403 on the same `?__token=` URL.
 */
const clientUrl = (req: GatedRequest): string => req.originalUrl || req.url || '/'

/**
 * Returns Connect middleware that gates the Vite origin behind a shared secret.
 * The first request must carry `?__token=`; a session cookie authenticates the rest.
 */
const tunnelTokenGate = (token: string) => (req: GatedRequest, res: ServerResponse, next: () => void) => {
  if (clientUrl(req).split('?')[0] === '/__tunnel-status') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ em: true, run: process.env.GITHUB_RUN_ID || '' }))
    return
  }

  // A request that arrives with a localhost or IP-literal authority cannot have come through the
  // Cloudflare tunnel: Cloudflare routes traffic to the tunnel by hostname, and the tunnel's
  // public hostname is a DNS name, never a bare IP. The gate exists to protect that public URL,
  // so direct local use — a developer's browser on localhost, the iOS Simulator suite, a LAN
  // device using the machine's IP — passes untokened even when TUNNEL_TOKEN is set (e.g. exported
  // globally in a shell profile). Vite's HTTPS dev server speaks HTTP/2, which carries the
  // authority in the `:authority` pseudo-header instead of Host, so check both.
  const host = String(req.headers[':authority'] || req.headers.host || '').replace(/:\d+$/, '')
  // an IPv6 literal authority is bracketed, e.g. [::1]
  const bareHost = host.replace(/^\[(.*)\]$/, '$1')
  if (host === 'localhost' || isIP(bareHost) !== 0) {
    return next()
  }

  const cookieHeader = req.headers.cookie || ''
  if (cookieHeader.split(';').some(c => c.trim() === `${COOKIE_NAME}=${token}`)) {
    return next()
  }

  const url = new URL(clientUrl(req), 'http://localhost')
  if (url.searchParams.get('__token') === token) {
    // Secure cookies are rejected on http://localhost, so assets after the first document
    // would 403. Cloudflare sets X-Forwarded-Proto: https for the public tunnel.
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
      .split(',')[0]
      .trim()
    const cookie = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax${
      forwardedProto === 'https' ? '; Secure' : ''
    }`
    res.setHeader('Set-Cookie', cookie)
    return next()
  }

  res.statusCode = 403
  res.end('Forbidden')
}

export default tunnelTokenGate
