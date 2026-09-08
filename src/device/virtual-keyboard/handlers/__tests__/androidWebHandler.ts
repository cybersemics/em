import { importTextActionCreator as importText } from '../../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../../actions/keyboardOpen'
import store from '../../../../stores/app'
import initStore from '../../../../test-helpers/initStore'
import selectRange from '../../../../test-helpers/selectRange'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../../test-helpers/setCursorFirstMatch'
import * as selection from '../../../selection'
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

it('exits edit mode when the virtual keyboard hides (e.g. Android Down Arrow)', async () => {
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
  await vi.waitFor(() => expect(store.getState().isKeyboardOpen).toBe(false))
})

// https://github.com/cybersemics/em/issues/4686
it('focuses the editable so that Chromium raises the virtual keyboard', () => {
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  document.body.appendChild(editable)

  expect(document.activeElement).not.toBe(editable)

  androidWebHandler.show!(editable)

  // Chromium only raises the keyboard for a script-initiated focus, not for the implicit focus that setting
  // the browser selection performs
  expect(document.activeElement).toBe(editable)
})

// geometrychange is the only signal mobile web gets, and it does not arrive until the keyboard has finished
// animating away. Blurring in the same beat makes Android rebuild the text context menu around the teardown, so a
// second menu flashes back after everything has already gone.
// https://github.com/cybersemics/em/issues/5259
it('collapses a selected range before blurring when the virtual keyboard hides', async () => {
  store.dispatch([
    importText({ text: '- Cybersemics Institute' }),
    setCursor(['Cybersemics Institute']),
    keyboardOpen({ value: true }),
  ])

  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.textContent = 'Cybersemics Institute'
  document.body.appendChild(editable)
  editable.focus()
  expect(selectRange(editable, 0, 'Cybersemics'.length)).toBe('Cybersemics')

  androidWebHandler.init()

  // simulate the virtual keyboard being dismissed without a blur (e.g. via the Android Down Arrow button)
  keyboardHeight = 0
  geometryChangeListeners.forEach(listener => listener())

  // the range is gone, so the context menu has nothing left to display
  expect(selection.isCollapsed()).toBe(true)
  // the thought keeps the caret, so the menu's dismissal does not overlap the blur that ends edit mode
  expect(document.activeElement).toBe(editable)

  // the blur follows on a later tick, once the menu has been dismissed
  await vi.waitFor(() => expect(store.getState().isKeyboardOpen).toBe(false))
  expect(document.activeElement).not.toBe(editable)

  document.body.removeChild(editable)
})
