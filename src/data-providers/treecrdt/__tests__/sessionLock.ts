type LockCallback = (lock: Lock | null) => Promise<unknown> | unknown

const TEST_TSID = 'test-thoughtspace'
const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks')

/** Installs a controllable Web Locks implementation for the current test. */
const setLocks = (request: (...args: unknown[]) => Promise<unknown>): void => {
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request },
  })
}

afterEach(() => {
  localStorage.clear()
  vi.resetModules()

  if (originalLocks) {
    Object.defineProperty(navigator, 'locks', originalLocks)
  } else {
    Reflect.deleteProperty(navigator, 'locks')
  }
})

it('holds an exclusive lock for this thoughtspace for the lifetime of the page', async () => {
  localStorage.setItem('tsid', TEST_TSID)
  const request = vi.fn((...args: unknown[]) => {
    const callback = args[2] as LockCallback
    return Promise.resolve(callback({ mode: 'exclusive', name: String(args[0]) } as Lock))
  })
  setLocks(request)

  const { acquireTreecrdtSessionLock } = await import('../sessionLock')

  await expect(acquireTreecrdtSessionLock()).resolves.toBe('acquired')
  await expect(acquireTreecrdtSessionLock()).resolves.toBe('acquired')
  expect(request).toHaveBeenCalledWith(
    `em-treecrdt-session:${TEST_TSID}`,
    { ifAvailable: true, mode: 'exclusive' },
    expect.any(Function),
  )
  expect(request).toHaveBeenCalledTimes(1)
})

it('reports when another tab already owns the thoughtspace', async () => {
  const request = vi.fn((...args: unknown[]) => {
    const callback = args[2] as LockCallback
    return Promise.resolve(callback(null))
  })
  setLocks(request)

  const { acquireTreecrdtSessionLock } = await import('../sessionLock')

  await expect(acquireTreecrdtSessionLock()).resolves.toBe('unavailable')
})

it('fails closed when Web Locks are unavailable', async () => {
  Reflect.deleteProperty(navigator, 'locks')

  const { acquireTreecrdtSessionLock } = await import('../sessionLock')

  await expect(acquireTreecrdtSessionLock()).resolves.toBe('unsupported')
})

it('does not lock isolated in-memory storage', async () => {
  localStorage.setItem('treecrdtStorage', 'memory')
  const request = vi.fn(() => Promise.resolve())
  setLocks(request)

  const { acquireTreecrdtSessionLock } = await import('../sessionLock')

  await expect(acquireTreecrdtSessionLock()).resolves.toBe('acquired')
  expect(request).not.toHaveBeenCalled()
})
