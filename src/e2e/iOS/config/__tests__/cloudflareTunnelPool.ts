// Imported rather than taken from globals: this directory is typechecked by src/e2e/iOS/tsconfig.json,
// whose ambient `it`/`expect` are WebdriverIO's and which has no `vi` at all. At runtime the file runs
// under the Vitest `unit` project (see vitest.config.ts), where these are the same functions.
import { EventEmitter } from 'events'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { findFirstAvailableTunnel } from '../cloudflareTunnelPool'

/** What the Cloudflare edge answers for one request: a status code and body, or null for no response at all. */
type Answer = { statusCode: number; body?: string } | null

/** Decides the edge's answer for each request, given the hostname, whether it is the status route, and how many times that hostname's route has been hit. */
let respond: (hostname: string, route: 'status' | 'token', count: number) => Answer

const { request } = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('https', () => ({ default: { request } }))
vi.mock('child_process', async () => {
  const { EventEmitter } = await import('events')
  /** A connector process that stays up and never exits, standing in for cloudflared. */
  const spawn = () => Object.assign(new EventEmitter(), { stdout: null, stderr: null, killed: false, kill: vi.fn() })
  return { spawn, default: { spawn } }
})
vi.mock('cloudflared', () => {
  const cloudflared = { bin: '/nonexistent/cloudflared', install: vi.fn() }
  return { ...cloudflared, default: cloudflared }
})
vi.mock('fs', async importOriginal => {
  const fs = await importOriginal<{ default: object }>()
  return { default: { ...fs.default, existsSync: () => true, createWriteStream: () => ({ write: () => true }) } }
})

const pool = [0, 1, 2, 3, 4].map(i => ({
  name: `em-test-${i}`,
  hostname: `em-test-${i}.example.com`,
  token: `connector-token-${i}`,
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'info').mockImplementation(() => {})
  const counts = new Map<string, number>()
  // Stands in for the Cloudflare edge: every request is answered by `respond`, synchronously after
  // end(), with a null answer surfacing as a connection error — which requestOnce treats the same
  // as its timeout.
  request.mockImplementation((url: string, _options: unknown, callback: (res: EventEmitter) => void) => {
    const { hostname, pathname } = new URL(url)
    const route = pathname === '/__tunnel-status' ? 'status' : 'token'
    const key = `${hostname} ${route}`
    const count = (counts.get(key) ?? 0) + 1
    counts.set(key, count)
    const req = Object.assign(new EventEmitter(), {
      destroy: () => {},
      end: () => {
        const answer = respond(hostname, route, count)
        if (!answer) {
          req.emit('error', new Error('ECONNRESET'))
          return
        }
        const res = Object.assign(new EventEmitter(), { statusCode: answer.statusCode, setEncoding: () => {} })
        callback(res)
        res.emit('data', answer.body ?? '')
        res.emit('end')
      },
    })
    return req
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

/** Runs the claim against the fake edge and advances the clock, returning how it settled by then. */
async function claimFor(ms: number) {
  let settled: { value: unknown } | { error: Error } | null = null
  findFirstAvailableTunnel(pool, 'app-gate-token').then(
    value => (settled = { value }),
    (error: Error) => (settled = { error }),
  )
  await vi.advanceTimersByTimeAsync(ms)
  return settled as { value: { url: string; name: string } } | { error: Error } | null
}

it('claims a free tunnel that answers every verification probe with this run token', async () => {
  respond = (_hostname, route) => (route === 'status' ? { statusCode: 530 } : { statusCode: 200 })

  const result = await claimFor(60 * 1000)

  expect(result).toMatchObject({ value: { url: expect.stringMatching(/^https:\/\/em-test-\d\.example\.com\/$/) } })
})

it('fails within minutes, blaming the edge, when no tunnel ever responds', async () => {
  respond = () => null

  const result = await claimFor(10 * 60 * 1000)

  expect(result).toHaveProperty('error')
  const { message } = (result as { error: Error }).error
  expect(message).toMatch(/Cloudflare edge .* is not responding/)
  expect(message).not.toMatch(/another connector/)
})

it('reports a verification probe that gets no response as an edge problem, not a second connector', async () => {
  // The incident shape: the tunnel looks free, answers once, then the edge goes quiet mid-burst.
  respond = (_hostname, route, count) =>
    route === 'status' ? { statusCode: 530 } : count % 2 === 1 ? { statusCode: 200 } : null

  const result = await claimFor(10 * 60 * 1000)

  expect(result).toHaveProperty('error')
  const { message } = (result as { error: Error }).error
  expect(message).toMatch(/stopped responding during verification/)
  expect(message).not.toMatch(/another connector/)
})

it('keeps waiting past the unresponsive limit while a tunnel is held by another run', async () => {
  respond = (hostname, route) =>
    route === 'status' && hostname === 'em-test-1.example.com' ? { statusCode: 200, body: '{"run":"other-run"}' } : null

  expect(await claimFor(20 * 60 * 1000)).toBeNull()
})

it('treats a foreign answer during verification as contention and waits out the pool timeout', async () => {
  respond = (_hostname, route, count) =>
    route === 'status' ? { statusCode: 530 } : count % 2 === 1 ? { statusCode: 200 } : { statusCode: 403 }

  const result = await claimFor(50 * 60 * 1000)

  expect(result).toHaveProperty('error')
  const { message } = (result as { error: Error }).error
  expect(message).toMatch(/still unavailable after waiting 45 min/)
  expect(message).toMatch(/another connector is live/)
})
