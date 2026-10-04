import { importTextActionCreator as importText } from '../../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../../actions/keyboardOpen'
import store from '../../../../stores/app'
import viewportStore from '../../../../stores/viewportStore'
import virtualKeyboardStore from '../../../../stores/virtualKeyboardStore'
import initStore from '../../../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../../test-helpers/setCursorFirstMatch'
import simulatedKeyboardHandler from '../simulatedKeyboardHandler'

/** Captures the geometrychange listeners registered by the handler so the test can invoke them. */
let geometryChangeListeners: (() => void)[] = []

/** The mocked occluded height of the virtual keyboard (0 = hidden). */
let keyboardHeight = 0

// Stub the Chromium VirtualKeyboard API, which is not available in jsdom.
beforeAll(() => {
  Object.defineProperty(navigator, 'virtualKeyboard', {
    configurable: true,
    value: {
      get boundingRect() {
        return { height: keyboardHeight } as DOMRectReadOnly
      },
      addEventListener: (event: string, callback: () => void) => {
        if (event === 'geometrychange') geometryChangeListeners.push(callback)
      },
      removeEventListener: (event: string, callback: () => void) => {
        geometryChangeListeners = geometryChangeListeners.filter(listener => listener !== callback)
      },
    },
  })
})

beforeEach(async () => {
  await initStore()
  keyboardHeight = 0
  viewportStore.update({ virtualKeyboardHeight: 300 })
  simulatedKeyboardHandler.init()
})

afterEach(() => {
  simulatedKeyboardHandler.destroy()
})

// Desktop Chrome's device emulation has no software keyboard, so without a simulated one keyboard-aware UI such as
// the Formatting Bar never appears.
it('opens virtualKeyboardStore at the estimated keyboard height when edit mode starts', async () => {
  store.dispatch([importText({ text: '- a' }), setCursor(['a']), keyboardOpen({ value: true })])
  await vi.runAllTimersAsync()

  expect(virtualKeyboardStore.getState()).toMatchObject({ open: true, height: 300 })
})

it('closes virtualKeyboardStore when edit mode ends', async () => {
  store.dispatch([importText({ text: '- a' }), setCursor(['a']), keyboardOpen({ value: true })])
  await vi.runAllTimersAsync()

  store.dispatch(keyboardOpen({ value: false }))
  await vi.runAllTimersAsync()

  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0 })
})

// A real phone pointed at the dev server has a real keyboard, and the simulated one must not stay on top of it.
it('stops simulating once the browser reports a real keyboard', async () => {
  keyboardHeight = 280
  geometryChangeListeners.forEach(listener => listener())

  store.dispatch([importText({ text: '- a' }), setCursor(['a']), keyboardOpen({ value: true })])
  await vi.runAllTimersAsync()

  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0 })
})
