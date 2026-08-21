import { initPermissionsStore } from '../permissionsStore'

const { get, set } = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}))

vi.mock('idb-keyval', () => ({ get, set }))

afterEach(() => {
  vi.unstubAllEnvs()
})

it('retries after a failed permissions load', async () => {
  vi.stubEnv('MODE', 'production')
  const error = new Error('load failed')
  get.mockRejectedValueOnce(error).mockResolvedValueOnce(undefined)

  await expect(initPermissionsStore()).rejects.toBe(error)
  await expect(initPermissionsStore()).resolves.toBeUndefined()
  expect(get).toHaveBeenCalledTimes(2)
})
