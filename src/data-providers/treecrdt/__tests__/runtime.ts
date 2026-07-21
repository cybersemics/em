import treecrdtRuntime from '../runtime'

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

  await expect(treecrdtRuntime.acquireAccess()).resolves.toEqual(access)
})
