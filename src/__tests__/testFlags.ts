import type { PreloadedEmWindow } from '../@types'

it('retains thoughtspace storage preloaded for browser tests', async () => {
  const emDescriptor = Object.getOwnPropertyDescriptor(window, 'em')
  const preloadedWindow = window as unknown as PreloadedEmWindow
  preloadedWindow.em = {
    ...preloadedWindow.em,
    testFlags: { thoughtspaceStorage: 'memory' },
  }
  vi.resetModules()

  try {
    const { default: testFlags } = await import('../e2e/testFlags')
    expect(testFlags.thoughtspaceStorage).toBe('memory')
  } finally {
    if (emDescriptor) Object.defineProperty(window, 'em', emDescriptor)
    else Reflect.deleteProperty(window, 'em')
    vi.resetModules()
  }
})
