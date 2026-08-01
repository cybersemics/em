import debugLog from '../../util/debugLog'
import loggerMiddleware from '../loggerMiddleware'

/** A pass-through next handler for the middleware. */
const next = (action: unknown) => action

/** Invokes the logger middleware for a single action with a no-op store and next. */
const invoke = (action: unknown) => {
  // the middleware only uses next(action); store api is unused
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loggerMiddleware({} as any)(next)(action as any)
}

beforeEach(() => {
  debugLog.setEnabled(false)
  debugLog.clear()
})

afterEach(() => {
  debugLog.setEnabled(false)
})

it('does not capture actions when debug logging is disabled', () => {
  invoke({ type: 'editThought', foo: 'bar' })
  expect(debugLog.read()).toEqual([])
})

it('captures every action when debug logging is enabled', () => {
  debugLog.setEnabled(true)
  debugLog.clear()
  invoke({ type: 'editThought', newValue: 'hello' })
  const actionEntries = debugLog.read().filter(e => e.type === 'action')
  expect(actionEntries.length).toBe(1)
  expect(actionEntries[0].actionType).toBe('editThought')
  expect(actionEntries[0].payload).toContain('hello')
})
