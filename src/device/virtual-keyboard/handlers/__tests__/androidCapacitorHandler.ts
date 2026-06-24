import { dismissCaretOnKeyboardClose } from '../../../../util/handleKeyboardVisibility'
import androidCapacitorHandler from '../androidCapacitorHandler'

/** Captures the native keyboard listeners registered by the handler so the test can invoke them. */
const mockKeyboardListeners: Record<string, () => void> = {}

vi.mock('@capacitor/core', () => ({
  Capacitor: {
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

vi.mock('../../../../util/handleKeyboardVisibility', () => ({
  dismissCaretOnKeyboardClose: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(dismissCaretOnKeyboardClose).mockClear()
})

it('dismisses the caret when the native keyboard hides (e.g. Android Down Arrow)', () => {
  androidCapacitorHandler.init()

  // the handler should subscribe to the native keyboardDidHide event
  expect(mockKeyboardListeners.keyboardDidHide).toBeDefined()

  // simulate the virtual keyboard being dismissed without a blur (e.g. via the Android Down Arrow button)
  mockKeyboardListeners.keyboardDidHide()

  expect(dismissCaretOnKeyboardClose).toHaveBeenCalledTimes(1)
})
