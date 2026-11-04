// Imported rather than taken from globals: this directory is typechecked by src/e2e/iOS/tsconfig.json,
// whose ambient `it`/`expect` are WebdriverIO's and which has no `vi` at all. At runtime the file runs
// under the Vitest `unit` project (see vitest.config.ts), where these are the same functions.
import { EventEmitter } from 'events'
import { PassThrough } from 'stream'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { findFirstAvailableTunnel } from '../cloudflareTunnelPool'

/**
 * What the Cloudflare edge answers for one request: a status code, or null for a request that
 * never gets an answer (a timeout or a connection error).
 */
type Respond = (url: string) => number | null

const edge = vi.hoisted(() => ({ respond: (() => null) as (url: string) => number | null }))
const appendFileSync = vi.hoisted(() => vi.fn())

// Every request the pool makes goes through https.request; answer each from the test's `respond`.
vi.mock('https', () => {
  /** Answers one request asynchronously, as the real module would. */
  const request = (url: string, _options: unknown, onResponse: (res: EventEmitter) => void) => {
    const req = Object.assign(new EventEmitter(), {
      destroy: () => {},
      end: () => {
        queueMicrotask(() => {
          const status = edge.respond(url)
          if (status === null) {
            req.emit('error', new Error('ETIMEDOUT'))
            return
          }
          const res = Object.assign(new EventEmitter(), { statusCode: status, setEncoding: () => {} })
          onResponse(res)
          res.emit('end')
        })
      },
    })
    return req
  }
  return { default: { request } }
})

// The connector binary is never started: claim() only needs a process it can pipe and kill.
vi.mock('child_process', () => {
  /** Stands in for the cloudflared connector process. */
  const spawn = () =>
    Object.assign(new EventEmitter(), {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      killed: false,
      kill: () => true,
    })
  return { spawn, default: { spawn } }
})
vi.mock('cloudflared', () => ({ bin: '/nonexistent/cloudflared', install: async () => {} }))
vi.mock('fs', async importOriginal => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    default: { ...actual, existsSync: () => true, createWriteStream: () => new PassThrough(), appendFileSync },
  }
})

const pool = [{ name: 'em-browserstack-0', hostname: 'em-browserstack-0.example.test', token: 'connector-token' }]

/** Answers the pre-attach status route with one status and this run's token probes with the next from a cycle. */
const edgeAnswering = (statusRoute: number | null, tokenProbes: (number | null)[]): Respond => {
  let i = 0
  return url => (url.includes('/__tunnel-status') ? statusRoute : tokenProbes[i++ % tokenProbes.length])
}

/** Starts a claim and resolves to whatever it rejects with, once `ms` of fake time has passed. */
const rejectionAfter = async (ms: number): Promise<unknown> => {
  let rejection: unknown = undefined
  const claiming = findFirstAvailableTunnel(pool, 'app-gate-token').then(
    () => {
      throw new Error('expected the claim to fail, but it claimed a tunnel')
    },
    err => {
      rejection = err
    },
  )
  await vi.advanceTimersByTimeAsync(ms)
  if (rejection === undefined) throw new Error(`the claim was still pending after ${ms / 60000} min`)
  await claiming
  return rejection
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'info').mockImplementation(() => {})
  // These tests run in GitHub Actions too, where an outage would otherwise be written to the real run.
  vi.stubEnv('GITHUB_ACTIONS', '')
  appendFileSync.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

it('claims a free tunnel that answers every verification probe with this run token', async () => {
  edge.respond = edgeAnswering(530, [200])

  const claiming = findFirstAvailableTunnel(pool, 'app-gate-token')
  await vi.advanceTimersByTimeAsync(60 * 1000)

  expect(await claiming).toMatchObject({ name: 'em-browserstack-0', url: 'https://em-browserstack-0.example.test/' })
})

it("fails naming the runner's network when no request ever gets an answer", async () => {
  edge.respond = edgeAnswering(null, [null])

  const err = await rejectionAfter(46 * 60 * 1000)

  expect((err as Error).message).toMatch(/could not reach the Cloudflare edge for the last/)
  expect((err as Error).message).not.toMatch(/another connector is live/)
})

it('backs off between passes while nothing answers', async () => {
  let statusRequests = 0
  edge.respond = url => {
    if (url.includes('/__tunnel-status')) statusRequests++
    return null
  }

  const claiming = findFirstAvailableTunnel(pool, 'app-gate-token').catch(() => {})
  await vi.advanceTimersByTimeAsync(10 * 60 * 1000)

  // Silent passes start at 0, then 1, 2 and 4 min after each one ends. A 10s rescan would have made
  // about 15 passes in the same time.
  expect(statusRequests).toBe(4)

  await vi.advanceTimersByTimeAsync(40 * 60 * 1000)
  await claiming
})

it('reports a verification probe that gets no answer as the edge going silent, not as another connector', async () => {
  // The tunnel looks free, this run's server answers once, and then nothing answers at all.
  edge.respond = edgeAnswering(530, [200, null])

  const err = await rejectionAfter(46 * 60 * 1000)

  expect((err as Error).message).toMatch(/stopped responding at verification 1\/5/)
  expect((err as Error).message).not.toMatch(/another connector is live/)
})

it('reports a verification probe answered by another server as another connector', async () => {
  edge.respond = edgeAnswering(530, [200, 403])

  const err = await rejectionAfter(46 * 60 * 1000)

  expect((err as Error).message).toMatch(/still unavailable after waiting 45 min/)
  expect((err as Error).message).toMatch(/failed verification 1\/5 with status 403 — another connector is live/)
})

it('keeps rescanning every 10s while a tunnel is busy with another run', async () => {
  let statusRequests = 0
  edge.respond = url => {
    if (url.includes('/__tunnel-status')) statusRequests++
    return 403
  }

  const err = await rejectionAfter(46 * 60 * 1000)

  expect((err as Error).message).toMatch(/still unavailable after waiting 45 min/)
  expect(statusRequests).toBeGreaterThan(200)
})

it('records how long the edge was unreachable once it answers again', async () => {
  vi.stubEnv('GITHUB_ACTIONS', 'true')
  vi.stubEnv('GITHUB_STEP_SUMMARY', '/github/step-summary')
  const start = Date.now()
  // Nothing answers for the first 10 min; after that the tunnel is free and this run's server answers.
  edge.respond = url => {
    if (Date.now() - start < 10 * 60 * 1000) return null
    return url.includes('/__tunnel-status') ? 530 : 200
  }

  const claiming = findFirstAvailableTunnel(pool, 'app-gate-token')
  await vi.advanceTimersByTimeAsync(20 * 60 * 1000)
  const claimed = await claiming

  expect(claimed.name).toBe('em-browserstack-0')
  expect(appendFileSync).toHaveBeenCalledWith(
    '/github/step-summary',
    expect.stringMatching(/unreachable from this runner for 1[0-9]m \d+s before it answered again/),
  )
  expect(console.info).toHaveBeenCalledWith(expect.stringMatching(/^::warning title=Cloudflare edge unreachable::/))
})
