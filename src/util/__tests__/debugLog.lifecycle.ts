import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import debugLog from '../debugLog'

// https://github.com/cybersemics/em/issues/5258
it('cleanupTestApp drains timers when a test left logging enabled', async () => {
  await createTestApp()
  debugLog.setEnabled(true)

  // The frame heartbeat reschedules itself through requestAnimationFrame, which fake timers fake. Left running, it
  // makes cleanupTestApp's vi.runAllTimersAsync reject with "Aborting after running 100000 timers".
  await cleanupTestApp()

  expect(debugLog.isEnabled()).toBe(false)
})
