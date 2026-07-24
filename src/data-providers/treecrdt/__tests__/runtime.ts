import createTreecrdtRuntime from '../runtime'

const { acquireTreecrdtSessionLock } = vi.hoisted(() => ({
  acquireTreecrdtSessionLock: vi.fn(),
}))

vi.mock('../sessionLock', () => ({ default: acquireTreecrdtSessionLock }))

afterEach(() => {
  acquireTreecrdtSessionLock.mockReset()
})

it.each([
  ['acquired', { status: 'acquired' }],
  ['unavailable', { status: 'blocked', reason: 'already-open' }],
  ['unsupported', { status: 'blocked', reason: 'unsupported' }],
] as const)('maps the %s session-lock status to thoughtspace access', async (lockStatus, access) => {
  acquireTreecrdtSessionLock.mockResolvedValue(lockStatus)
  const treecrdtRuntime = createTreecrdtRuntime({ tabPolicy: 'single' })

  await expect(treecrdtRuntime.acquireAccess()).resolves.toEqual(access)
  expect(acquireTreecrdtSessionLock).toHaveBeenCalledWith()
})

it('does not require a session lock when multiple tabs are allowed', async () => {
  const treecrdtRuntime = createTreecrdtRuntime({
    client: { storage: 'memory', runtime: 'direct' },
    tabPolicy: 'multiple',
  })

  await expect(treecrdtRuntime.acquireAccess()).resolves.toEqual({ status: 'acquired' })
  expect(acquireTreecrdtSessionLock).not.toHaveBeenCalled()
})

it('rejects unsupported multiple-tab client settings at both the type and runtime boundaries', () => {
  // Pre-bootstrap configuration crosses a JavaScript boundary, so retain the runtime guard in addition to the type.
  // @ts-expect-error Persistent dedicated-worker storage is incompatible with multiple-tab access.
  const invalidConfig: Parameters<typeof createTreecrdtRuntime>[0] = {
    client: { storage: 'persistent', runtime: 'dedicated-worker' },
    tabPolicy: 'multiple',
  }

  expect(() => createTreecrdtRuntime(invalidConfig)).toThrow(
    'Multiple-tab TreeCRDT access requires in-memory storage with the direct runtime.',
  )
})
