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
  const treecrdtRuntime = createTreecrdtRuntime()

  await expect(treecrdtRuntime.acquireAccess()).resolves.toEqual(access)
  expect(acquireTreecrdtSessionLock).toHaveBeenCalledWith('opfs')
})

it('does not require a session lock for in-memory storage', async () => {
  acquireTreecrdtSessionLock.mockResolvedValue('acquired')
  const treecrdtRuntime = createTreecrdtRuntime({ storage: 'memory', runtime: 'direct' })

  await expect(treecrdtRuntime.acquireAccess()).resolves.toEqual({ status: 'acquired' })
  expect(acquireTreecrdtSessionLock).toHaveBeenCalledWith('memory')
})
