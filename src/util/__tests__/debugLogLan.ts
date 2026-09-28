/**
 * Separate from debugLog.ts because the jsdom URL can only be set per file, and the main suite runs on jsdom's default localhost URL.
 *
 * @vitest-environment jsdom
 * @vitest-environment-options {"url": "https://192.168.0.32:3000/"}
 */
import { vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
})

it('auto-enables on a private LAN address, where a phone opens the dev server', async () => {
  vi.stubEnv('MODE', 'development')
  vi.resetModules()
  const fresh = (await import('../debugLog')).default
  expect(fresh.autoEnabled).toBe(true)
  expect(fresh.isEnabled()).toBe(true)
  // stop the fresh instance's frame heartbeat
  fresh.setEnabled(false)
  expect(fresh.isEnabled()).toBe(false)
})
