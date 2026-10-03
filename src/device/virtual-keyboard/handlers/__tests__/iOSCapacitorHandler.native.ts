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

it('publishes normalized timed geometry for the renderer and clears it at the endpoint', () => {
  const startedAt = Date.now() - 150
  listeners.keyboardAnimation({
    stage: 'start',
    id: 1,
    fromHeight: 0,
    toHeight: 320,
    startedAt,
    durationMs: 300,
    bezier: [0, 0, 1, 1],
  })

  const motion = virtualKeyboardStore.getState().motion!
  expect(motion).toMatchObject({ startedAt, duration: 300 })
  expect(motion.heights[0]).toBe(0)
  expect(motion.heights[Math.floor(motion.heights.length / 2)]).toBe(140)
  expect(motion.heights.at(-1)).toBe(300)

  listeners.keyboardAnimation({ stage: 'end', id: 1, toHeight: 320 })
  expect(virtualKeyboardStore.getState().motion).toBeUndefined()
})

it('anchors closing to the native clock rather than edit-mode exit', () => {
  store.dispatch(keyboardOpen({ value: true }))
  listeners.keyboardAnimation({
    stage: 'start',
    id: 1,
    fromHeight: 0,
    toHeight: 320,
    startedAt: Date.now() - 300,
    durationMs: 300,
    bezier: [0, 0, 1, 1],
  })
  listeners.keyboardAnimation({ stage: 'end', id: 1, toHeight: 320 })

  const startedAt = Date.now()
  store.dispatch(keyboardOpen({ value: false }))
  expect(virtualKeyboardStore.getState().motion?.startedAt).toBe(startedAt)
  // The estimate prepares compositor tracks before the native callback arrives.
  listeners.keyboardAnimation({ stage: 'end', id: 1, toHeight: 320 })
  expect(virtualKeyboardStore.getState().motion?.startedAt).toBe(startedAt)

  vi.advanceTimersByTime(30)
  listeners.keyboardAnimation({
    stage: 'start',
    id: 2,
    fromHeight: 320,
    toHeight: 0,
    startedAt: Date.now(),
    durationMs: 300,
    bezier: [0, 0, 1, 1],
  })
  expect(virtualKeyboardStore.getState().motion?.startedAt).toBe(startedAt + 30)
  expect(virtualKeyboardStore.getState().height).toBe(300)
  listeners.keyboardAnimation({ stage: 'end', id: 2, toHeight: 0 })
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0, motion: undefined })
})

it('keeps the keyboard geometry when edit mode ends but an input retains focus', () => {
  store.dispatch(keyboardOpen({ value: true }))
  listeners.keyboardAnimation({
    stage: 'start',
    id: 1,
    fromHeight: 0,
    toHeight: 320,
    startedAt: Date.now() - 300,
    durationMs: 300,
    bezier: [0, 0, 1, 1],
  })
  listeners.keyboardAnimation({ stage: 'end', id: 1, toHeight: 320 })
  const input = document.createElement('input')
  document.body.appendChild(input)
  input.focus()
  store.dispatch(keyboardOpen({ value: false }))
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: true, height: 300, motion: undefined })
  input.remove()
})
