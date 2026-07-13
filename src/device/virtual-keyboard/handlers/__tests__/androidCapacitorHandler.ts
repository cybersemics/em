import { importTextActionCreator as importText } from '../../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../../actions/keyboardOpen'
import store from '../../../../stores/app'
import initStore from '../../../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../../test-helpers/setCursorFirstMatch'
import androidCapacitorHandler from '../androidCapacitorHandler'

/** Captures the native keyboard listeners registered by the handler so the test can invoke them. */
const mockKeyboardListeners: Record<string, () => void> = {}

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'android',
    isNativePlatform: () => true,
    isPluginAvailable: () => true,
  },
}))

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: (event: string, callback: () => void) => {
      mockKeyboardListeners[event] = callback
      return Promise.resolve({ remove: () => {} })
    },
    removeAllListeners: () => Promise.resolve(),
  },
}))

beforeEach(initStore)

it('exits edit mode when the native keyboard hides (e.g. Android Down Arrow)', () => {
  // put the cursor on a thought with the keyboard open
  store.dispatch([importText({ text: '- a' }), setCursor(['a']), keyboardOpen({ value: true })])
  expect(store.getState().isKeyboardOpen).toBe(true)

  androidCapacitorHandler.init()

  // the handler should subscribe to the native keyboardDidHide event
  expect(mockKeyboardListeners.keyboardDidHide).toBeDefined()

  // simulate the virtual keyboard being dismissed without a blur (e.g. via the Android Down Arrow button)
  mockKeyboardListeners.keyboardDidHide()

  // edit mode should be exited now that the keyboard is closed
  expect(store.getState().isKeyboardOpen).toBe(false)
})
