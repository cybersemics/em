import waitForBrowserStackSlots from '../waitForBrowserStackSlots'

/** Builds a plan.json response with the given usage, as BrowserStack's Automate plan endpoint returns it. */
const planResponse = (running: number, allowed = 5, queued = 0, queuedMax = 5) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({
    parallel_sessions_running: running,
    parallel_sessions_max_allowed: allowed,
    queued_sessions: queued,
    queued_sessions_max_allowed: queuedMax,
  }),
})

beforeEach(() => {
  process.env.BROWSERSTACK_USERNAME = 'test-user'
  process.env.BROWSERSTACK_ACCESS_KEY = 'test-key'
  vi.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('proceeds immediately when the pool and queue have room', async () => {
  const fetchMock = vi.fn().mockResolvedValue(planResponse(1))
  vi.stubGlobal('fetch', fetchMock)

  await waitForBrowserStackSlots(2)

  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('waits until a later poll reports room', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(planResponse(5))
    .mockResolvedValueOnce(planResponse(4))
    .mockResolvedValue(planResponse(0))
  vi.stubGlobal('fetch', fetchMock)
  vi.useFakeTimers()

  const waiting = waitForBrowserStackSlots(2)
  await vi.advanceTimersByTimeAsync(60000)
  await waiting

  expect(fetchMock).toHaveBeenCalledTimes(3)
})

it('waits when parallels are free but the session-create queue cannot take this run', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(planResponse(0, 5, 5, 5))
    .mockResolvedValue(planResponse(0, 5, 0, 5))
  vi.stubGlobal('fetch', fetchMock)
  vi.useFakeTimers()

  const waiting = waitForBrowserStackSlots(2)
  await vi.advanceTimersByTimeAsync(30000)
  await waiting

  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('throws as starvation, naming the observed usage, when the pool never frees up', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(planResponse(5)))
  vi.useFakeTimers()

  const assertion = expect(waitForBrowserStackSlots(2)).rejects.toThrow(
    /starved of BrowserStack sessions.*5\/5 sessions running, 0\/5 queued/,
  )
  // The ceiling is three hours; a poll lands at most 20s after it, so 3h 1m is past the throw.
  await vi.advanceTimersByTimeAsync(3 * 60 * 60 * 1000 + 60 * 1000)
  await assertion
})

it('throws when the plan endpoint responds with an error status', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' }))

  await expect(waitForBrowserStackSlots(2)).rejects.toThrow('HTTP 401 Unauthorized')
})

it('throws when the plan endpoint returns a payload without the usage fields', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', json: async () => ({}) }))

  await expect(waitForBrowserStackSlots(2)).rejects.toThrow('queued_sessions')
})

it('throws when the BrowserStack credentials are missing', async () => {
  delete process.env.BROWSERSTACK_ACCESS_KEY
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  await expect(waitForBrowserStackSlots(2)).rejects.toThrow('BROWSERSTACK_ACCESS_KEY')
  expect(fetchMock).not.toHaveBeenCalled()
})
