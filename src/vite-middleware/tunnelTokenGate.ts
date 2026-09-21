import type { IncomingMessage, ServerResponse } from 'http'

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
 * Middleware for the development server, when running behind a Cloudflare Tunnel pool (see cloudflareTunnelPool.ts).
 * Protects the tunnel with a shared secret token, so that only clients that know the token can reach the dev server through the tunnel.
 * Without such a secret, the tunnel would be public and accessible over the internet, which is undesirable.
 * Only enforce the token check for requests that come through the tunnel, as determined by the request's host header matching the tunnel's public hostname.
 */
const tunnelTokenGate =
  (token: string, tunnelHostSuffix: string) => (req: GatedRequest, res: ServerResponse, next: () => void) => {
    const pathname = clientUrl(req).split('?')[0]

    // Create a simple status endpoint for the tunnel pool to check if the dev server is up and running.
    if (pathname === '/__tunnel-status') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ em: true, run: process.env.GITHUB_RUN_ID || '' }))
      return
    }

    // Vite's HTTPS dev server speaks HTTP/2, which carries the authority in the `:authority`
    // pseudo-header instead of Host, so check both.
    const host = String(req.headers[':authority'] || req.headers.host || '').replace(/:\d+$/, '')
    const viaTunnel = host === tunnelHostSuffix.slice(1) || host.endsWith(tunnelHostSuffix)

    if (!viaTunnel) {
      // Token discovery for the iOS test runner (wdio.browserstack.conf.ts), which needs the
      // token to claim a tunnel and to build the URL the device loads. Deliberately unreachable
      // through the tunnel (this branch), so the public hostname never leaks the secret that
      // guards it.
      if (pathname === '/__tunnel-token') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ token }))
        return
      }
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
