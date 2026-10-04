import { keyboardOpenActionCreator as keyboardOpen } from '../../../../actions/keyboardOpen'
import store from '../../../../stores/app'
import viewportStore from '../../../../stores/viewportStore'
import virtualKeyboardStore from '../../../../stores/virtualKeyboardStore'
import iOSCapacitorHandler from '../iOSCapacitorHandler'

const listeners: Record<string, (event: Record<string, unknown>) => void> = {}
const removeListener = vi.fn()

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'ios', isNativePlatform: () => true, isPluginAvailable: () => true },
  registerPlugin: () => ({
    addListener: (name: string, listener: (event: Record<string, unknown>) => void) => {
      listeners[name] = listener
      return Promise.resolve({ remove: removeListener })
    },
    getState: () => Promise.resolve({ height: 0 }),
  }),
}))

// Control the external frame scheduler for scalar timing tests. Simulator captures verify real rendering order.
vi.mock('framer-motion', async importOriginal => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  const pending = new Map<() => void, ReturnType<typeof setTimeout>>()
  return {
    ...actual,
    frame: {
      ...actual.frame,
      /** Schedules a deterministic update frame against the test clock. */
      update: (callback: () => void) => {
        pending.set(
          callback,
          setTimeout(() => {
            pending.delete(callback)
            callback()
          }, 16),
        )
      },
    },
    /** Cancels the scheduled update for a superseded or disposed native transition. */
    cancelFrame: (callback: () => void) => {
      clearTimeout(pending.get(callback))
      pending.delete(callback)
    },
  }
})

beforeEach(async () => {
  vi.useFakeTimers()
  document.documentElement.style.setProperty('--safe-area-inset-bottom', '20px')
  iOSCapacitorHandler.init()
  await Promise.resolve()
})

afterEach(() => {
  iOSCapacitorHandler.destroy()
  document.documentElement.style.removeProperty('--safe-area-inset-bottom')
})

it('catches up to native elapsed time when the opening callback arrives late', () => {
  listeners.keyboardAnimation({
    stage: 'start',
    id: 1,
    fromHeight: 0,
    toHeight: 320,
    startedAt: Date.now() - 150,
    durationMs: 300,
    bezier: [0, 0, 1, 1],
  })

  // The callback arrived halfway through the native animation; a fresh animation from zero would lag.
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: true, height: 140 })
  expect(viewportStore.getState().virtualKeyboardHeight).toBe(300)

  listeners.keyboardAnimation({ stage: 'end', id: 1, toHeight: 320 })
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: true, height: 300 })
})

it('samples the UIKit spring at its native age', () => {
  listeners.keyboardAnimation({
    stage: 'start',
    id: 1,
    fromHeight: 0,
    toHeight: 320,
    startedAt: Date.now() - 100,
    durationMs: 400,
    spring: { mass: 1, stiffness: 400, damping: 40, velocity: 0 },
  })

  // A critically damped spring at 100 ms has reached 1 - 3 * exp(-2) of its displacement.
  expect(virtualKeyboardStore.getState().height).toBeCloseTo(170.078128, 5)
})

it('keeps closing synchronized and ignores the end of a superseded opening', () => {
  listeners.keyboardAnimation({ stage: 'end', id: 1, toHeight: 320 })
  listeners.keyboardAnimation({
    stage: 'start',
    id: 2,
    fromHeight: 320,
    toHeight: 0,
    startedAt: Date.now() - 150,
    durationMs: 300,
    bezier: [0, 0, 1, 1],
  })
  listeners.keyboardAnimation({ stage: 'end', id: 1, toHeight: 320 })

  expect(virtualKeyboardStore.getState()).toMatchObject({ open: true, height: 140 })
  expect(viewportStore.getState().virtualKeyboardHeight).toBe(300)

  listeners.keyboardAnimation({ stage: 'end', id: 2, toHeight: 0 })
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0 })
})

it('keeps scalar geometry steady on blur until native dismissal begins', () => {
  store.dispatch(keyboardOpen({ value: true }))
  listeners.keyboardAnimation({ stage: 'end', id: 1, toHeight: 320 })
  store.dispatch(keyboardOpen({ value: false }))
  vi.advanceTimersByTime(30)
  expect(virtualKeyboardStore.getState()).toEqual({ open: true, height: 300, openPercent: 1, phase: undefined })
  listeners.keyboardAnimation({
    stage: 'start',
    id: 2,
    fromHeight: 320,
    toHeight: 0,
    startedAt: Date.now() - 150,
    durationMs: 300,
    bezier: [0, 0, 1, 1],
  })
  expect(virtualKeyboardStore.getState().height).toBe(140)
  listeners.keyboardAnimation({ stage: 'end', id: 2, toHeight: 0 })
  expect(virtualKeyboardStore.getState()).toEqual({ open: false, height: 0, openPercent: 0, phase: undefined })
})

it('applies a zero-duration native transition immediately', () => {
  listeners.keyboardAnimation({ stage: 'end', id: 1, toHeight: 320 })
  listeners.keyboardAnimation({
    stage: 'start',
    id: 2,
    fromHeight: 320,
    toHeight: 0,
    startedAt: Date.now(),
    durationMs: 0,
  })
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0, openPercent: 0 })
})

it('stops sampling and releases its listener on teardown', async () => {
  listeners.keyboardAnimation({
    stage: 'start',
    id: 1,
    fromHeight: 0,
    toHeight: 320,
    startedAt: Date.now() - 150,
    durationMs: 300,
    bezier: [0, 0, 1, 1],
  })
  iOSCapacitorHandler.destroy()
  await vi.runAllTimersAsync()
  expect(virtualKeyboardStore.getState().height).toBe(140)
  expect(removeListener).toHaveBeenCalled()
})

it('continues publishing scalar samples between native notifications', () => {
  listeners.keyboardAnimation({
    stage: 'start',
    id: 1,
    fromHeight: 0,
    toHeight: 320,
    startedAt: Date.now(),
    durationMs: 300,
    bezier: [0, 0, 1, 1],
  })
  vi.advanceTimersByTime(100)
  expect(virtualKeyboardStore.getState().height).toBeGreaterThan(60)
  expect(virtualKeyboardStore.getState().height).toBeLessThan(100)
  listeners.keyboardAnimation({ stage: 'end', id: 1, toHeight: 320 })
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: true, height: 300, openPercent: 1 })
})
