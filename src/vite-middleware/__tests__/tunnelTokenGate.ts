import type { IncomingMessage, ServerResponse } from 'http'
import tunnelTokenGate from '../tunnelTokenGate'

const TOKEN = 'a1b2c3'
const SUFFIX = '.emthought.cc'

/** What the gate did with one simulated request: called next, or ended the response itself. */
interface GateResult {
  next: boolean
  statusCode: number
  body: string
  headers: Record<string, string>
}

/** Runs one request through the gate middleware and captures its disposition. */
const run = (request: {
  host?: string
  authority?: string
  url?: string
  originalUrl?: string
  cookie?: string
  forwardedProto?: string
}): GateResult => {
  const headers: Record<string, string> = {}
  if (request.host !== undefined) headers.host = request.host
  if (request.authority !== undefined) headers[':authority'] = request.authority
  if (request.cookie !== undefined) headers.cookie = request.cookie
  if (request.forwardedProto !== undefined) headers['x-forwarded-proto'] = request.forwardedProto

  const result: GateResult = { next: false, statusCode: 200, body: '', headers: {} }
  const req = { headers, url: request.url ?? '/', originalUrl: request.originalUrl } as unknown as IncomingMessage
  const res = {
    get statusCode() {
      return result.statusCode
    },
    set statusCode(code: number) {
      result.statusCode = code
    },
    setHeader: (name: string, value: string) => {
      result.headers[name.toLowerCase()] = value
    },
    end: (chunk?: string) => {
      result.body = chunk ?? ''
    },
  } as unknown as ServerResponse

  tunnelTokenGate(TOKEN, SUFFIX)(req, res, () => {
    result.next = true
  })
  return result
}

describe('off-tunnel authorities pass ungated', () => {
  it('localhost', () => {
    expect(run({ host: 'localhost:3000' }).next).toBe(true)
  })

  it('IPv4 literal', () => {
    expect(run({ host: '192.168.1.20:3000' }).next).toBe(true)
  })

  it('bracketed IPv6 literal', () => {
    expect(run({ host: '[::1]:3000' }).next).toBe(true)
  })

  it('bs-local.com (BrowserStack Local)', () => {
    expect(run({ host: 'bs-local.com:3000' }).next).toBe(true)
  })

  it('mDNS hostname', () => {
    expect(run({ host: 'machine.local:3000' }).next).toBe(true)
  })
})

describe('tunnel authorities are gated', () => {
  it('403s without a token', () => {
    const result = run({ host: 'bs1.emthought.cc' })
    expect(result.next).toBe(false)
    expect(result.statusCode).toBe(403)
  })

  it('403s the apex domain without a token', () => {
    expect(run({ host: 'emthought.cc' }).statusCode).toBe(403)
  })

  it('403s a wrong ?__token=', () => {
    expect(run({ host: 'bs1.emthought.cc', url: `/?__token=wrong` }).statusCode).toBe(403)
  })

  it('passes a correct ?__token= and sets the session cookie', () => {
    const result = run({ host: 'bs1.emthought.cc', url: `/?__token=${TOKEN}` })
    expect(result.next).toBe(true)
    expect(result.headers['set-cookie']).toContain(`__tunnel_token=${TOKEN}`)
  })

  it('marks the cookie Secure when Cloudflare forwarded https', () => {
    const result = run({ host: 'bs1.emthought.cc', url: `/?__token=${TOKEN}`, forwardedProto: 'https' })
    expect(result.headers['set-cookie']).toContain('Secure')
  })

  it('passes a request bearing the session cookie', () => {
    expect(run({ host: 'bs1.emthought.cc', cookie: `__tunnel_token=${TOKEN}` }).next).toBe(true)
  })

  it('403s a stale session cookie', () => {
    expect(run({ host: 'bs1.emthought.cc', cookie: '__tunnel_token=stale' }).statusCode).toBe(403)
  })

  it('reads the token from originalUrl when Vite rewrote url to /index.html', () => {
    expect(run({ host: 'bs1.emthought.cc', url: '/index.html', originalUrl: `/?__token=${TOKEN}` }).next).toBe(true)
  })

  it('reads the HTTP/2 :authority pseudo-header when Host is absent', () => {
    expect(run({ authority: 'bs1.emthought.cc' }).statusCode).toBe(403)
  })
})

describe('/__tunnel-status', () => {
  it('answers on a tunnel authority without a token, for pre-claim occupancy checks', () => {
    const result = run({ host: 'bs1.emthought.cc', url: '/__tunnel-status' })
    expect(result.next).toBe(false)
    expect(result.statusCode).toBe(200)
    expect((JSON.parse(result.body) as { em: boolean }).em).toBe(true)
  })
})

describe('/__tunnel-token', () => {
  it('reveals the token to off-tunnel clients, which already have ungated access', () => {
    const result = run({ host: 'localhost:3000', url: '/__tunnel-token' })
    expect(result.next).toBe(false)
    expect(result.statusCode).toBe(200)
    expect((JSON.parse(result.body) as { token: string }).token).toBe(TOKEN)
  })

  it('is unreachable through the tunnel, so the public hostname never leaks the secret', () => {
    const result = run({ host: 'bs1.emthought.cc', url: '/__tunnel-token' })
    expect(result.statusCode).toBe(403)
    expect(result.body).not.toContain(TOKEN)
  })
})
