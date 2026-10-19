import debugLog from '../debugLog'

// Emulate the native iOS app, where the Capacitor Device plugin reports the hardware model.
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'ios', isNativePlatform: () => true, isPluginAvailable: () => true },
}))

vi.mock('@capacitor/device', () => ({
  Device: { getInfo: () => Promise.resolve({ model: 'iPhone15,4' }) },
}))

it('names the hardware model in the native app, which a browser hides behind the device family', () => {
  expect(debugLog.format().split('\n')[0]).toMatch(/^--- device: iPhone15,4 \(ios\), /)
})
