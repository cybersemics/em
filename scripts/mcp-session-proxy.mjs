#!/usr/bin/env node
/*
 * Local WebDriver shim so the wdio-MCP (or the bridge) can drive the pre-created BrowserStack iOS
 * session — WITHOUT forking @wdio/mcp or injecting a custom transport into its process.
 *
 * The problem it solves, in one place:
 *   1. Attach   — @wdio/mcp only ever CREATES sessions (webdriverio remote()), never attaches to an
 *                 existing one. So POST /session here returns a fake "new session" response carrying
 *                 the session id bringup.sh already created — the MCP adopts our session, believing
 *                 it made it.
 *   2. Timeout  — that fake response is instant, so the MCP host's request timeout never fires
 *                 (real BrowserStack iOS provisioning takes minutes; here there's nothing to wait for).
 *   3. Transport— every real command (/session/<id>/*) is forwarded to BrowserStack over node:https.
 *                 The sandbox firewall's Go MITM re-emits requests and duplicates a lowercase
 *                 `content-length` (exactly what undici, WebdriverIO's HTTP engine, sends); BrowserStack's
 *                 nginx then 400s the duplicate (RFC 7230 §3.3.2). node:https emits a SINGLE canonical
 *                 `Content-Length`, which the MITM de-dupes/leaves alone. The MCP↔shim hop is plain http
 *                 to localhost, which the sandbox never intercepts.
 *
 * Point @wdio/mcp at it:
 *   start_session({ provider: 'local', platform: 'ios', noReset: true,
 *     appiumConfig: { protocol: 'http', host: '127.0.0.1', port: <PORT>, path: '/wd/hub' } })
 *
 * Config (env): EM_MCP_PROXY_PORT (default 4723), EM_BRIDGE_SESSION_FILE (default /tmp/em-bs-session.txt),
 *   BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY, and (for tests) EM_UPSTREAM_HOST / EM_UPSTREAM_PORT /
 *   EM_UPSTREAM_PROTOCOL to override the BrowserStack hub.
 */
import { readFileSync } from 'node:fs'
import http from 'node:http'
import https from 'node:https'

const PORT = Number(process.env.EM_MCP_PROXY_PORT) || 4723
const SESSION_FILE = process.env.EM_BRIDGE_SESSION_FILE ?? '/tmp/em-bs-session.txt'
const UP_HOST = process.env.EM_UPSTREAM_HOST ?? 'hub-cloud.browserstack.com'
const UP_PORT = Number(process.env.EM_UPSTREAM_PORT) || 443
const UP_PROTOCOL = process.env.EM_UPSTREAM_PROTOCOL ?? 'https'
const user = process.env.BROWSERSTACK_USERNAME
const key = process.env.BROWSERSTACK_ACCESS_KEY

const log = (...a) => console.error('[mcp-session-proxy]', ...a)
const readSessionId = () => readFileSync(SESSION_FILE, 'utf8').trim()

/** Capabilities returned in the fake new-session response — marks it iOS so webdriverio adds the
 *  Appium/mobile commands (getContexts, switchContext, …) the MCP tools rely on. */
const sessionCaps = {
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:platformVersion': process.env.EM_IOS_VERSION ?? '26',
  'appium:deviceName': process.env.EM_IOS_DEVICE ?? 'iPhone 15',
}

/** Read the whole request body as a Buffer. */
const readBody = req =>
  new Promise(resolve => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
  })

/**
 * Forward one request to the real BrowserStack hub over node:https, injecting Basic auth.
 *
 * node:https is the entire reason this hop exists: it emits a SINGLE canonical `Content-Length`, so the
 * sandbox firewall's Go MITM has nothing to duplicate (see the header comment). We set only these
 * headers — never the client's — so no stray lowercase `content-length` is ever forwarded, and let
 * node compute the length from the body. (EM_UPSTREAM_PROTOCOL=http switches to node:http for tests.)
 */
const forward = (req, body, res) =>
  new Promise(resolve => {
    const mod = UP_PROTOCOL === 'http' ? http : https
    const headers = { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${user}:${key}`).toString('base64') }
    if (body.length) headers['Content-Length'] = body.length // single, canonical, explicit
    const upstreamReq = mod.request({ hostname: UP_HOST, port: UP_PORT, path: req.url, method: req.method, headers }, upstream => {
      const chunks = []
      upstream.on('data', c => chunks.push(c))
      upstream.on('end', () => {
        const upBody = Buffer.concat(chunks)
        if ((upstream.statusCode ?? 0) >= 400) {
          log(`forward ${req.method} ${req.url} via=node:https sent-bytes=${body.length} -> HTTP ${upstream.statusCode} server=${upstream.headers.server} body: ${upBody.toString('utf8').slice(0, 200).replace(/\s+/g, ' ')}`)
        }
        res.writeHead(upstream.statusCode ?? 502, { 'content-type': upstream.headers['content-type'] ?? 'application/json' })
        res.end(upBody)
        resolve()
      })
    })
    upstreamReq.setTimeout(60000, () => upstreamReq.destroy(new Error('upstream timeout')))
    upstreamReq.on('error', e => {
      log('upstream error', e.message)
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ value: { error: 'proxy upstream error', message: e.message } }))
      resolve()
    })
    if (body.length) upstreamReq.write(body)
    upstreamReq.end()
  })

const server = http.createServer(async (req, res) => {
  const url = req.url ?? ''
  const body = await readBody(req)
  const isNewSession = req.method === 'POST' && /\/session\/?$/.test(url)
  const isDeleteSession = req.method === 'DELETE' && /\/session\/[^/]+\/?$/.test(url)
  const isStatus = req.method === 'GET' && /\/status\/?$/.test(url)

  // New session -> hand back our already-created session id instead of creating one.
  if (isNewSession) {
    const sessionId = readSessionId()
    log(`adopt session ${sessionId} (faked new-session response)`)
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ value: { sessionId, capabilities: sessionCaps } }))
    return
  }
  // Session delete -> swallow it, so closing the MCP session doesn't tear down the real BrowserStack
  // session (the heartbeat + bridge own its lifecycle).
  if (isDeleteSession) {
    log('swallowed DELETE /session (real session preserved)')
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ value: null }))
    return
  }
  // Status probe some clients make before session create.
  if (isStatus) {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ value: { ready: true, message: 'proxy ready' } }))
    return
  }
  // Everything else (session-scoped commands) -> forward to BrowserStack over undici HTTP/2.
  await forward(req, body, res)
})

if (!user || !key) log('WARNING: BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY not set — forwards will fail auth')
server.listen(PORT, '127.0.0.1', () =>
  log(`listening on http://127.0.0.1:${PORT} -> ${UP_PROTOCOL}://${UP_HOST}:${UP_PORT}`),
)
