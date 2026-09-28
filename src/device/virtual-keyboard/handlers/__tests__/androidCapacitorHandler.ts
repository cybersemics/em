import viewportStore from '../../../../stores/viewportStore'
import virtualKeyboardStore from '../../../../stores/virtualKeyboardStore'
import androidCapacitorHandler from '../androidCapacitorHandler'

const listeners: Record<string, (info?: { keyboardHeight: number }) => void> = {}
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, isPluginAvailable: () => true },
}))
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: (name: string, listener: (info?: { keyboardHeight: number }) => void) => {
      listeners[name] = listener
    },
    removeAllListeners: () => {},
  },
}))

it('reports keyboard closing and completion through the shared store', () => {
  virtualKeyboardStore.reset()
  androidCapacitorHandler.init()
  listeners.keyboardWillHide()
  expect(virtualKeyboardStore.getState().phase).toBe('closing')
  listeners.keyboardDidHide()
  expect(virtualKeyboardStore.getState().phase).toBe('closed')
  androidCapacitorHandler.destroy()
})

// The WebView keeps its full height when the keyboard opens, so the height of the area the keyboard covers is invisible
// to the web layer and can only come from the native event. Without it scrollCursorIntoView believes the whole screen is
// visible and leaves the caret underneath the keyboard.
// https://github.com/cybersemics/em/issues/5670
it('reports the keyboard height while the native keyboard is up', () => {
  virtualKeyboardStore.reset()
  androidCapacitorHandler.init()

  expect(listeners.keyboardWillShow).toBeDefined()

  listeners.keyboardWillShow({ keyboardHeight: 342 })
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: true, height: 342 })
  expect(viewportStore.getState().virtualKeyboardHeight).toBe(342)

  // the height persists through keyboardWillHide so that elements above the keyboard do not drop behind it mid-animation
  listeners.keyboardWillHide()
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: true, height: 342 })

  listeners.keyboardDidHide()
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0 })
  androidCapacitorHandler.destroy()
})
