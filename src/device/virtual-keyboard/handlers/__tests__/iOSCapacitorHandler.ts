import { importTextActionCreator as importText } from '../../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../../actions/keyboardOpen'
import { LongPressState } from '../../../../constants'
import store from '../../../../stores/app'
import viewportStore from '../../../../stores/viewportStore'
import virtualKeyboardStore from '../../../../stores/virtualKeyboardStore'
import initStore from '../../../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../../test-helpers/setCursorFirstMatch'
import iOSCapacitorHandler from '../iOSCapacitorHandler'

const { listeners, remove, registration, availability, native } = vi.hoisted(() => ({
  native: {
    addListener: vi.fn(async () => ({ remove: async () => {} })),
    getState: vi.fn(async () => ({ height: 0 })),
    measure: vi.fn(),
  },
  listeners: {} as Record<string, (info?: { keyboardHeight: number }) => void>,
  remove: vi.fn(async () => {}),
  availability: { measurement: false },
  registration: { defer: false, resolve: [] as ((handle: { remove: () => Promise<void> }) => void)[] },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'ios',
    isNativePlatform: () => true,
    isPluginAvailable: (name: string) =>
      name === 'Keyboard' || (availability.measurement && name === 'IOSKeyboardPlugin'),
  },
  registerPlugin: () => native,
}))
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    removeAllListeners: vi.fn(),
    addListener: (name: string, listener: (info?: { keyboardHeight: number }) => void) => {
      listeners[name] = listener
      return registration.defer
        ? new Promise(resolve => registration.resolve.push(resolve))
        : Promise.resolve({ remove })
    },
  },
}))

beforeEach(() => {
  remove.mockClear()
  native.addListener.mockClear()
  native.getState.mockClear()
  native.measure.mockClear()
  availability.measurement = false
  registration.defer = false
  registration.resolve = []
})

afterEach(() => {
  iOSCapacitorHandler.destroy()
  document.documentElement.style.removeProperty('--safe-area-inset-bottom')
  vi.restoreAllMocks()
})

// https://github.com/cybersemics/em/issues/4869
it('focuses the editable so WKWebView can keep the keyboard open after undo', () => {
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  document.body.appendChild(editable)

  expect(document.activeElement).not.toBe(editable)

  iOSCapacitorHandler.show!(editable)

  expect(document.activeElement).toBe(editable)
  editable.remove()
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

it('uses TypeScript timing even when the native measurement plugin is available', async () => {
  await initStore()
  availability.measurement = true
  document.documentElement.style.setProperty('--safe-area-inset-bottom', '20px')
  iOSCapacitorHandler.init()
  expect(native.addListener).not.toHaveBeenCalled()
  expect(native.getState).not.toHaveBeenCalled()
  listeners.keyboardWillShow({ keyboardHeight: 320 })
  await vi.runAllTimersAsync()
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: true, height: 300 })
  listeners.keyboardWillHide()
  await vi.runAllTimersAsync()
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0 })
  expect(native.measure).not.toHaveBeenCalled()
})

it('ignores keyboard focus caused by a long-press drag', async () => {
  await initStore()
  iOSCapacitorHandler.init()
  vi.spyOn(store, 'getState').mockReturnValue({ ...store.getState(), longPress: LongPressState.DragHold })
  listeners.keyboardWillShow({ keyboardHeight: 320 })
  await vi.runAllTimersAsync()
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0 })
})

it('removes only its own listeners and ignores callbacks after teardown', async () => {
  await initStore()
  iOSCapacitorHandler.init()
  await Promise.resolve()
  iOSCapacitorHandler.destroy()
  iOSCapacitorHandler.destroy()
  expect(remove).toHaveBeenCalledTimes(2)
  listeners.keyboardWillShow({ keyboardHeight: 320 })
  await vi.runAllTimersAsync()
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0 })
})

it('removes listener registrations that resolve after teardown', async () => {
  await initStore()
  registration.defer = true
  iOSCapacitorHandler.init()
  iOSCapacitorHandler.destroy()
  registration.resolve.forEach(resolve => resolve({ remove }))
  await Promise.resolve()
  expect(remove).toHaveBeenCalledTimes(2)
})
