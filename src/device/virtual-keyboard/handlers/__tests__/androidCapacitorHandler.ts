import virtualKeyboardStore from '../../../../stores/virtualKeyboardStore'
import androidCapacitorHandler from '../androidCapacitorHandler'

const listeners: Record<string, () => void> = {}
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, isPluginAvailable: () => true },
}))
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: (name: string, listener: () => void) => {
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
