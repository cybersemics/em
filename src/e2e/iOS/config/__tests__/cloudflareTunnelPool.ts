// Imported rather than taken from globals: this directory is typechecked by src/e2e/iOS/tsconfig.json,
// whose ambient `it`/`expect` are WebdriverIO's and which has no `vi` at all. At runtime the file runs
// under the Vitest `unit` project (see vitest.config.ts), where these are the same functions.
import { EventEmitter } from 'events'
import { PassThrough } from 'stream'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CloudflareEdgeUnreachableError, findFirstAvailableTunnel } from '../cloudflareTunnelPool'

/**
 * What the Cloudflare edge answers for one request: a status code, or null for a request that
 * never gets an answer (a timeout or a connection error).
 */
type Respond = (url: string) => number | null

const edge = vi.hoisted(() => ({ respond: (() => null) as (url: string) => number | null }))

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
    default: { ...actual, existsSync: () => true, createWriteStream: () => new PassThrough() },
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
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('fails fast as an unreachable edge when no request ever gets an answer', async () => {
  edge.respond = edgeAnswering(null, [null])

  const err = await rejectionAfter(10 * 60 * 1000)

  expect(err).toBeInstanceOf(CloudflareEdgeUnreachableError)
  expect((err as Error).message).toMatch(/cannot reach the Cloudflare edge/)
})

it('reports a verification probe that gets no answer as the edge going silent, not as another connector', async () => {
  // The tunnel looks free, this run's server answers once, and then nothing answers at all.
  edge.respond = edgeAnswering(530, [200, null])

  const err = await rejectionAfter(10 * 60 * 1000)

  expect(err).toBeInstanceOf(CloudflareEdgeUnreachableError)
  expect((err as Error).message).toMatch(/stopped responding at verification 1\/5/)
  expect((err as Error).message).not.toMatch(/another connector is live/)
})

it('reports a verification probe answered by another server as another connector, and keeps waiting', async () => {
  edge.respond = edgeAnswering(530, [200, 403])

  const err = await rejectionAfter(46 * 60 * 1000)

  expect(err).not.toBeInstanceOf(CloudflareEdgeUnreachableError)
  expect((err as Error).message).toMatch(/still unavailable after waiting 45 min/)
  expect((err as Error).message).toMatch(/failed verification 1\/5 with status 403 — another connector is live/)
})

it('keeps waiting the full 45 min while a tunnel is busy with another run', async () => {
  edge.respond = edgeAnswering(403, [null])

  const err = await rejectionAfter(46 * 60 * 1000)

  expect(err).not.toBeInstanceOf(CloudflareEdgeUnreachableError)
  expect((err as Error).message).toMatch(/still unavailable after waiting 45 min/)
})

it('restarts the silence window whenever the pool shows contention', async () => {
  // Busy for the first 4 min, then nothing answers at all. The silence window has to be counted
  // from the last busy answer, not from the start of the wait.
  const start = Date.now()
  edge.respond = url => {
    if (Date.now() - start < 4 * 60 * 1000) return url.includes('/__tunnel-status') ? 403 : null
    return null
  }

  let rejection: unknown = undefined
  const claiming = findFirstAvailableTunnel(pool, 'app-gate-token').catch(err => {
    rejection = err
  })

  await vi.advanceTimersByTimeAsync(8 * 60 * 1000)
  expect(rejection).toBeUndefined()

  await vi.advanceTimersByTimeAsync(3 * 60 * 1000)
  await claiming
  expect(rejection).toBeInstanceOf(CloudflareEdgeUnreachableError)
})
