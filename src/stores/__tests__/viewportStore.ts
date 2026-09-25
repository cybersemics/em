import { resetStores } from '../ministore'
import viewportStore, { updateSize } from '../viewportStore'

/** Simulates the virtual keyboard by shrinking the visual viewport, or restores jsdom's lack of one. */
const setKeyboardHeight = (height: number | null) => {
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: height === null ? undefined : { height: window.innerHeight - height },
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  setKeyboardHeight(null)
  vi.useRealTimers()
})

// https://github.com/cybersemics/em/issues/5256
it('does not write a keyboard height measured before a reset back into the store after it', () => {
  const initialHeight = viewportStore.getState().virtualKeyboardHeight

  setKeyboardHeight(300)
  updateSize()
  vi.advanceTimersByTime(20)
  expect(viewportStore.getState().virtualKeyboardHeight).toBe(300)

  resetStores()

  setKeyboardHeight(0)
  updateSize()
  vi.advanceTimersByTime(20)
  expect(viewportStore.getState().virtualKeyboardHeight).toBe(initialHeight)
})

it('reports the last measured keyboard height after the keyboard closes', () => {
  setKeyboardHeight(300)
  updateSize()
  vi.advanceTimersByTime(20)

  setKeyboardHeight(0)
  updateSize()
  vi.advanceTimersByTime(20)

  expect(viewportStore.getState().virtualKeyboardHeight).toBe(300)
})
