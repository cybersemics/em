/**
 * Separate from debugLog.ts because the jsdom URL can only be set per file, and the main suite runs on jsdom's default localhost URL.
 *
 * @vitest-environment jsdom
 * @vitest-environment-options {"url": "https://em-preview.vercel.app/"}
 */
import { vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
})

it('auto-enables on *.vercel.app preview deployments in production mode', async () => {
  vi.stubEnv('MODE', 'production')
  vi.resetModules()
  const fresh = (await import('../debugLog')).default
  expect(fresh.autoEnabled).toBe(true)
  expect(fresh.isEnabled()).toBe(true)
  // stop the fresh instance's frame heartbeat
  fresh.setEnabled(false)
  expect(fresh.isEnabled()).toBe(false)
})
