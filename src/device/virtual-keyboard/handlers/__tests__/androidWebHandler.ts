import { importTextActionCreator as importText } from '../../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../../actions/keyboardOpen'
import store from '../../../../stores/app'
import initStore from '../../../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../../test-helpers/setCursorFirstMatch'
import androidWebHandler from '../androidWebHandler'

/** Captures the geometrychange listeners registered by the handler so the test can invoke them. */
const geometryChangeListeners: (() => void)[] = []

/** The mocked occluded height of the virtual keyboard (0 = hidden). */
let keyboardHeight = 0

// Stub the Chromium VirtualKeyboard API, which is not available in jsdom.
beforeAll(() => {
  Object.defineProperty(navigator, 'virtualKeyboard', {
    configurable: true,
    value: {
      overlaysContent: false,
      get boundingRect() {
        return { height: keyboardHeight } as DOMRectReadOnly
      },
      addEventListener: (event: string, callback: () => void) => {
        if (event === 'geometrychange') geometryChangeListeners.push(callback)
      },
      removeEventListener: () => {},
    },
  })
})

beforeEach(initStore)

it('exits edit mode when the virtual keyboard hides (e.g. Android Down Arrow)', () => {
  // put the cursor on a thought with the keyboard open
  store.dispatch([importText({ text: '- a' }), setCursor(['a']), keyboardOpen({ value: true })])
  expect(store.getState().isKeyboardOpen).toBe(true)

  androidWebHandler.init()

  // the handler should opt in to the VirtualKeyboard API and subscribe to geometrychange
  expect(navigator.virtualKeyboard.overlaysContent).toBe(true)
  expect(geometryChangeListeners.length).toBeGreaterThan(0)

  // simulate the virtual keyboard being dismissed without a blur (e.g. via the Android Down Arrow button)
  keyboardHeight = 0
  geometryChangeListeners.forEach(listener => listener())

  // edit mode should be exited now that the keyboard is closed
  expect(store.getState().isKeyboardOpen).toBe(false)
})
