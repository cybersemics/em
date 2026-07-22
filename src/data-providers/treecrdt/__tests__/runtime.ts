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
  // Persistent client settings prove that tab policy, rather than storage or worker choice, controls access.
  const treecrdtRuntime = createTreecrdtRuntime({
    client: { storage: 'opfs', runtime: 'dedicated-worker' },
    tabPolicy: 'multiple',
  })

  await expect(treecrdtRuntime.acquireAccess()).resolves.toEqual({ status: 'acquired' })
  expect(acquireTreecrdtSessionLock).not.toHaveBeenCalled()
})
