import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import webKit27Store, { init } from '../webKit27Store'

vi.mock('@capacitor/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@capacitor/core')>()
  return {
    ...actual,
    Capacitor: { ...actual.Capacitor, getPlatform: vi.fn(() => 'web'), isPluginAvailable: vi.fn(() => true) },
  }
})

vi.mock('@capacitor/device', () => ({ Device: { getInfo: vi.fn() } }))

beforeEach(() => {
  webKit27Store.reset()
  vi.mocked(Capacitor.getPlatform).mockReturnValue('ios')
  vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true)
})

it('is true in the iOS app on iOS 27', async () => {
  vi.mocked(Device.getInfo).mockResolvedValue({ osVersion: '27.0' } as Awaited<ReturnType<typeof Device.getInfo>>)
  await init()
  expect(webKit27Store.getState()).toBe(true)
})

it('is false in the iOS app on iOS 26', async () => {
  vi.mocked(Device.getInfo).mockResolvedValue({ osVersion: '26.4.1' } as Awaited<ReturnType<typeof Device.getInfo>>)
  await init()
  expect(webKit27Store.getState()).toBe(false)
})

it('is false in an iOS app built without the Device plugin', async () => {
  vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(false)
  vi.mocked(Device.getInfo).mockResolvedValue({ osVersion: '27.0' } as Awaited<ReturnType<typeof Device.getInfo>>)
  await init()
  expect(webKit27Store.getState()).toBe(false)
})
