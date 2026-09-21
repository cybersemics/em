import { vi } from 'vitest'
import { importTextActionCreator as importText } from '../../actions/importText'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import debugLog from '../../util/debugLog'

beforeEach(initStore)

afterEach(() => {
  debugLog.setEnabled(false)
  debugLog.clear()
})

it('logs a push entry when thought updates are flushed to persistence, and pushSynced when the write completes', async () => {
  debugLog.setEnabled(true)
  debugLog.clear()

  store.dispatch(importText({ text: '- a' }))

  const pushes = debugLog.read().filter(e => e.type === 'push')
  expect(pushes.length).toBeGreaterThan(0)
  expect(pushes[0].thoughtCount as number).toBeGreaterThan(0)
  expect(pushes[0].local).toBe(true)
  expect((pushes[0].thoughts as { id: string; value: string }[]).length).toBeGreaterThan(0)

  // The sync confirmation lands once the provider write resolves. Flush only the timers already pending: fake timers
  // fake requestAnimationFrame, so runAllTimersAsync would loop forever on debugLog's self-rescheduling frame heartbeat.
  await vi.runOnlyPendingTimersAsync()
  expect(debugLog.read().some(e => e.type === 'pushSynced')).toBe(true)
})

it('does not log push entries when debug logging is disabled', async () => {
  store.dispatch(importText({ text: '- a' }))
  await vi.runAllTimersAsync()
  expect(debugLog.read().filter(e => e.type === 'push' || e.type === 'pushSynced')).toEqual([])
})
