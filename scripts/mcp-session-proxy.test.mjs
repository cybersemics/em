/**
 * Integration test for mcp-session-proxy.mjs: launch the real script against a local stub upstream
 * and assert the three behaviors it exists to provide — adopting the pre-created session instead of
 * creating one, swallowing session deletes, and forwarding commands with a single canonical
 * Content-Length plus injected Basic auth (the sandbox-MITM dodge described in the script's
 * header). No BrowserStack credentials or device needed: the script's documented EM_UPSTREAM_*
 * seams point it at the stub over plain HTTP. Run by .github/workflows/agent-scripts.yml.
 *
 * ```sh
 * node scripts/mcp-session-proxy.test.mjs
 * ```
 */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import http from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Not the script's default 4723 so a real proxy left running locally cannot collide.
const proxyPort = '4724'
const sessionId = 'em-test-session-adopted'
const timeoutMs = 15_000
const pollMs = 100

const username = 'stub-user'
const accessKey = 'stub-key'

/** Requests the stub upstream has received, each { method, url, rawHeaders, body }. */
const upstreamRequests = []

// Stub upstream standing in for the BrowserStack hub. Records every request verbatim (rawHeaders
// preserves duplicates and casing, which the Content-Length assertion depends on) and answers with
// a recognizable payload so relaying can be asserted end to end.
const upstream = http.createServer((req, res) => {
  const chunks = []
  req.on('data', c => chunks.push(c))
  req.on('end', () => {
    upstreamRequests.push({
      method: req.method,
      url: req.url,
      rawHeaders: req.rawHeaders,
      body: Buffer.concat(chunks).toString('utf8'),
    })
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ value: 'upstream-answered' }))
  })
})
await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve))
const upstreamPort = upstream.address().port

const sessionFile = path.join(tmpdir(), `em-test-bs-session-${process.pid}.txt`)
writeFileSync(sessionFile, `${sessionId}\n`)

let output = ''
/** Set by the exit handler so waiters can fail fast instead of sleeping out the timeout. */
let exited = null

const child = spawn(process.execPath, [fileURLToPath(new URL('mcp-session-proxy.mjs', import.meta.url))], {
  env: {
    ...process.env,
    EM_MCP_PROXY_PORT: proxyPort,
    EM_BRIDGE_SESSION_FILE: sessionFile,
    EM_UPSTREAM_HOST: '127.0.0.1',
    EM_UPSTREAM_PORT: String(upstreamPort),
    EM_UPSTREAM_PROTOCOL: 'http',
    BROWSERSTACK_USERNAME: username,
    BROWSERSTACK_ACCESS_KEY: accessKey,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
child.stdout.on('data', data => (output += data))
child.stderr.on('data', data => (output += data))
child.on('exit', (code, signal) => {
  exited = { code, signal }
})

/** Shuts down the stub upstream and the proxy child process. */
const cleanup = () => {
  upstream.close()
  if (!exited) child.kill('SIGTERM')
}

/** Print the failure and the script's captured output, then exit nonzero. */
const fail = message => {
  console.error(`FAIL: ${message}\n\n--- mcp-session-proxy.mjs output ---\n${output || '(none)'}`)
  cleanup()
  process.exit(1)
}

// Wait for readiness through the script's own /status route; a crash fails immediately with the log.
const deadline = Date.now() + timeoutMs
for (;;) {
  if (exited) fail(`script exited (code ${exited.code}, signal ${exited.signal}) before /status answered`)
  try {
    const res = await fetch(`http://127.0.0.1:${proxyPort}/wd/hub/status`)
    const status = await res.json()
    if (status.value?.ready === true) break
    fail(`/status answered but not ready: ${JSON.stringify(status)}`)
  } catch {
    // proxy not up yet
  }
  if (Date.now() > deadline) fail(`proxy did not answer /status on :${proxyPort} within ${timeoutMs / 1000}s`)
  await new Promise(resolve => setTimeout(resolve, pollMs))
}

// New session -> the proxy must answer locally with the pre-created session id, marked iOS so
// webdriverio adds the Appium command set — and must NOT create a session upstream.
const newSessionRes = await fetch(`http://127.0.0.1:${proxyPort}/wd/hub/session`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ capabilities: { alwaysMatch: {} } }),
})
const newSession = await newSessionRes.json()
if (newSession.value?.sessionId !== sessionId)
  fail(`POST /session adopted ${JSON.stringify(newSession.value?.sessionId)}, expected "${sessionId}"`)
if (newSession.value?.capabilities?.platformName !== 'iOS')
  fail(`POST /session capabilities are ${JSON.stringify(newSession.value?.capabilities)}, expected platformName iOS`)
if (upstreamRequests.length !== 0)
  fail(`POST /session reached the upstream (${JSON.stringify(upstreamRequests)}); adoption must be local`)

// Session delete -> swallowed locally, so the MCP closing its session cannot tear down the real one.
const deleteRes = await fetch(`http://127.0.0.1:${proxyPort}/wd/hub/session/${sessionId}`, { method: 'DELETE' })
const deleted = await deleteRes.json()
if (deleteRes.status !== 200 || deleted.value !== null)
  fail(`DELETE /session/<id> answered ${deleteRes.status} ${JSON.stringify(deleted)}, expected 200 {value:null}`)
if (upstreamRequests.length !== 0)
  fail(`DELETE /session/<id> reached the upstream (${JSON.stringify(upstreamRequests)}); it must be swallowed`)

// Session command -> forwarded to the upstream with injected Basic auth, the intact body, and
// exactly one canonical Content-Length (a duplicate lowercase content-length is the firewall-MITM
// failure the node:https hop exists to prevent), with the upstream's response relayed back.
const commandBody = JSON.stringify({ url: 'https://localhost:3000/' })
const commandRes = await fetch(`http://127.0.0.1:${proxyPort}/wd/hub/session/${sessionId}/url`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: commandBody,
})
const command = await commandRes.json()
if (command.value !== 'upstream-answered')
  fail(`command response was ${JSON.stringify(command)}, expected the stub upstream's {value:"upstream-answered"}`)
if (upstreamRequests.length !== 1)
  fail(`expected exactly the command request upstream, got ${JSON.stringify(upstreamRequests)}`)
const forwarded = upstreamRequests[0]
if (forwarded.method !== 'POST' || forwarded.url !== `/wd/hub/session/${sessionId}/url`)
  fail(`forwarded request was ${forwarded.method} ${forwarded.url}, expected POST /wd/hub/session/${sessionId}/url`)
if (forwarded.body !== commandBody)
  fail(`forwarded body was ${JSON.stringify(forwarded.body)}, expected ${commandBody}`)
const expectedAuth = 'Basic ' + Buffer.from(`${username}:${accessKey}`).toString('base64')
const authIndex = forwarded.rawHeaders.findIndex(h => h.toLowerCase() === 'authorization')
if (authIndex === -1 || forwarded.rawHeaders[authIndex + 1] !== expectedAuth)
  fail(
    `forwarded Authorization was ${JSON.stringify(forwarded.rawHeaders[authIndex + 1])}, expected injected Basic auth`,
  )
const contentLengths = forwarded.rawHeaders.filter((h, i) => i % 2 === 0 && h.toLowerCase() === 'content-length')
if (contentLengths.length !== 1 || contentLengths[0] !== 'Content-Length')
  fail(
    `forwarded request carried ${contentLengths.length} content-length header(s) (${JSON.stringify(contentLengths)}), expected exactly one canonical Content-Length`,
  )

console.info(`PASS: mcp-session-proxy adopted ${sessionId}, swallowed DELETE, and forwarded the command cleanly`)
cleanup()
process.exit(0)
