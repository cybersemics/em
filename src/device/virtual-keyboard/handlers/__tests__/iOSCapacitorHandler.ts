import { importTextActionCreator as importText } from '../../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../../actions/keyboardOpen'
import store from '../../../../stores/app'
import viewportStore from '../../../../stores/viewportStore'
import virtualKeyboardStore from '../../../../stores/virtualKeyboardStore'
import initStore from '../../../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../../test-helpers/setCursorFirstMatch'
import iOSCapacitorHandler from '../iOSCapacitorHandler'

const listeners: Record<string, (info?: { keyboardHeight: number }) => void> = {}

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'ios', isNativePlatform: () => true, isPluginAvailable: () => true },
}))
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: (name: string, listener: (info?: { keyboardHeight: number }) => void) => {
      listeners[name] = listener
    },
    removeAllListeners: () => {},
  },
}))

afterEach(() => {
  iOSCapacitorHandler.destroy()
  document.documentElement.style.removeProperty('--safe-area-inset-bottom')
})

// https://github.com/cybersemics/em/issues/4869
it('focuses the editable so WKWebView can keep the keyboard open after undo', () => {
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  document.body.appendChild(editable)

  expect(document.activeElement).not.toBe(editable)

  iOSCapacitorHandler.show!(editable)

  expect(document.activeElement).toBe(editable)
})

it('starts moving with edit mode before native keyboard callbacks arrive', async () => {
  await initStore()
  document.documentElement.style.setProperty('--safe-area-inset-bottom', '20px')
  viewportStore.update({ virtualKeyboardHeight: 300 })
  iOSCapacitorHandler.init()

  store.dispatch([importText({ text: '- a' }), setCursor(['a']), keyboardOpen({ value: true })])
  await vi.runAllTimersAsync()
  expect(virtualKeyboardStore.getState().height).toBe(280)

  listeners.keyboardWillShow({ keyboardHeight: 320 })
  await vi.runAllTimersAsync()
  expect(virtualKeyboardStore.getState().height).toBe(300)

  store.dispatch(keyboardOpen({ value: false }))
  await vi.runAllTimersAsync()
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0 })

  listeners.keyboardWillHide()
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0 })

  store.dispatch(keyboardOpen({ value: true }))
  await vi.runAllTimersAsync()
  expect(virtualKeyboardStore.getState().height).toBe(300)
})
