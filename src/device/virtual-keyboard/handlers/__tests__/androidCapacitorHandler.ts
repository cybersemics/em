import viewportStore from '../../../../stores/viewportStore'
import virtualKeyboardStore from '../../../../stores/virtualKeyboardStore'
import androidCapacitorHandler from '../androidCapacitorHandler'

let nativeKeyboard = new EventTarget()
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true, isPluginAvailable: () => true },
}))
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: (name: string, listener: (info: { keyboardHeight: number }) => void) => {
      nativeKeyboard.addEventListener(name, event => listener((event as CustomEvent).detail))
    },
    removeAllListeners: () => {},
  },
}))

beforeEach(() => {
  nativeKeyboard = new EventTarget()
})

// https://github.com/cybersemics/em/pull/6073#issuecomment-6594233627
it('measures overlay keyboard height from native show events', () => {
  androidCapacitorHandler.init()
  nativeKeyboard.dispatchEvent(new CustomEvent('keyboardWillShow', { detail: { keyboardHeight: 300 } }))
  expect(viewportStore.getState().virtualKeyboardHeight).toBe(300)
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: true, height: 300, phase: 'opening' })
  nativeKeyboard.dispatchEvent(new Event('keyboardDidShow'))
  expect(virtualKeyboardStore.getState().phase).toBe('open')
  nativeKeyboard.dispatchEvent(new Event('keyboardDidHide'))
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0, phase: 'closed' })
  androidCapacitorHandler.destroy()
})

it('reports keyboard closing and completion through the shared store', () => {
  virtualKeyboardStore.reset()
  androidCapacitorHandler.init()
  nativeKeyboard.dispatchEvent(new Event('keyboardWillHide'))
  expect(virtualKeyboardStore.getState().phase).toBe('closing')
  nativeKeyboard.dispatchEvent(new Event('keyboardDidHide'))
  expect(virtualKeyboardStore.getState().phase).toBe('closed')
  androidCapacitorHandler.destroy()
})
