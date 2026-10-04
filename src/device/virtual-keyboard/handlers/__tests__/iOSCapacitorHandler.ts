import { LongPressState } from '../../../../constants'
import store from '../../../../stores/app'
import viewportStore from '../../../../stores/viewportStore'
import virtualKeyboardStore from '../../../../stores/virtualKeyboardStore'
import iOSCapacitorHandler from '../iOSCapacitorHandler'

const { listeners, frames, clock, remove, registration } = vi.hoisted(() => ({
  listeners: {} as Record<string, (info?: { keyboardHeight: number }) => void>,
  frames: new Set<() => void>(),
  clock: { now: 0 },
  remove: vi.fn(async () => {}),
  registration: { defer: false, resolve: [] as ((handle: { remove: () => Promise<void> }) => void)[] },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'ios',
    isNativePlatform: () => true,
    isPluginAvailable: (name: string) => name === 'Keyboard',
  },
  registerPlugin: () => ({}),
}))
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: (name: string, callback: (info?: { keyboardHeight: number }) => void) => {
      listeners[name] = callback
      return registration.defer
        ? new Promise(resolve => registration.resolve.push(resolve))
        : Promise.resolve({ remove })
    },
  },
}))

// Control the external scheduler and clock for the handler's scalar-state contract.
vi.mock('framer-motion', async importOriginal => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  frame: { update: (callback: () => void) => frames.add(callback) },
  cancelFrame: (callback: () => void) => frames.delete(callback),
}))

/** Advances the sampling clock without delivering another keyboard notification. */
const renderFrame = (time: number) => {
  clock.now = time
  const pending = [...frames]
  if (!pending.length) throw new Error('No keyboard frame scheduled')
  frames.clear()
  pending.forEach(callback => callback())
}

beforeEach(async () => {
  frames.clear()
  clock.now = 0
  registration.defer = false
  registration.resolve = []
  remove.mockClear()
  vi.spyOn(performance, 'now').mockImplementation(() => clock.now)
  document.documentElement.style.setProperty('--safe-area-inset-bottom', '20px')
  iOSCapacitorHandler.init()
  await Promise.resolve()
})

afterEach(() => {
  iOSCapacitorHandler.destroy()
  document.documentElement.style.removeProperty('--safe-area-inset-bottom')
  vi.restoreAllMocks()
})

it('samples the calibrated spring and reconciles the measured open height', () => {
  listeners.keyboardWillShow({ keyboardHeight: 320 })
  renderFrame(100)
  expect(virtualKeyboardStore.getState().height).toBeCloseTo(198.186678, 5)
  expect(viewportStore.getState().virtualKeyboardHeight).toBe(300)
  listeners.keyboardDidShow({ keyboardHeight: 320 })
  expect(virtualKeyboardStore.getState()).toEqual({ open: true, height: 300, openPercent: 1, phase: undefined })
  expect(frames.size).toBe(0)
})

it('closes from the open height and ignores an opening completion during dismissal', () => {
  listeners.keyboardDidShow({ keyboardHeight: 320 })
  listeners.keyboardWillHide()
  renderFrame(100)
  expect(virtualKeyboardStore.getState().height).toBeCloseTo(81.813322, 5)
  listeners.keyboardDidShow({ keyboardHeight: 320 })
  expect(virtualKeyboardStore.getState().height).toBeCloseTo(81.813322, 5)
  listeners.keyboardDidHide()
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0, openPercent: 0 })
  expect(frames.size).toBe(0)
})

it('reopens from the sampled closing height and ignores an outdated hide completion', () => {
  listeners.keyboardDidShow({ keyboardHeight: 320 })
  listeners.keyboardWillHide()
  renderFrame(100)
  const interruptedHeight = virtualKeyboardStore.getState().height
  listeners.keyboardWillShow({ keyboardHeight: 320 })
  expect(virtualKeyboardStore.getState().height).toBe(interruptedHeight)
  listeners.keyboardDidHide()
  expect(virtualKeyboardStore.getState().height).toBe(interruptedHeight)
  renderFrame(200)
  expect(virtualKeyboardStore.getState().height).toBeGreaterThan(interruptedHeight)
  listeners.keyboardDidShow({ keyboardHeight: 320 })
  expect(virtualKeyboardStore.getState().height).toBe(300)
})

it('does not restart an opening animation for a duplicate notification', () => {
  listeners.keyboardWillShow({ keyboardHeight: 320 })
  renderFrame(100)
  listeners.keyboardWillShow({ keyboardHeight: 320 })
  renderFrame(200)
  expect(virtualKeyboardStore.getState().height).toBeCloseTo(283.570884, 5)
})

it('tracks a changed keyboard height while already open', () => {
  listeners.keyboardDidShow({ keyboardHeight: 320 })
  listeners.keyboardWillShow({ keyboardHeight: 400 })
  expect(virtualKeyboardStore.getState().height).toBe(300)
  expect(viewportStore.getState().virtualKeyboardHeight).toBe(380)
  renderFrame(100)
  expect(virtualKeyboardStore.getState().height).toBeGreaterThan(300)
  expect(virtualKeyboardStore.getState().height).toBeLessThan(380)
  listeners.keyboardDidShow({ keyboardHeight: 400 })
  expect(virtualKeyboardStore.getState()).toMatchObject({ height: 380, openPercent: 1 })
})

it('settles immediate completion events without waiting for the calibrated duration', () => {
  listeners.keyboardWillShow({ keyboardHeight: 320 })
  listeners.keyboardDidShow({ keyboardHeight: 320 })
  expect(virtualKeyboardStore.getState().height).toBe(300)
  listeners.keyboardWillHide()
  listeners.keyboardDidHide()
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0 })
  expect(frames.size).toBe(0)
})

it('finishes locally if no completion notification arrives', () => {
  listeners.keyboardWillShow({ keyboardHeight: 320 })
  renderFrame(400)
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: true, height: 300 })
  expect(frames.size).toBe(0)
  listeners.keyboardWillHide()
  renderFrame(800)
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0 })
  expect(frames.size).toBe(0)
})

it('ignores transient keyboard shows while dragging', () => {
  vi.spyOn(store, 'getState').mockReturnValue({ ...store.getState(), longPress: LongPressState.DragHold })
  listeners.keyboardWillShow({ keyboardHeight: 320 })
  listeners.keyboardDidShow({ keyboardHeight: 320 })
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: false, height: 0 })
  expect(frames.size).toBe(0)
})

it('releases only its own listeners and ignores notifications after teardown', () => {
  listeners.keyboardWillShow({ keyboardHeight: 320 })
  renderFrame(100)
  const height = virtualKeyboardStore.getState().height
  iOSCapacitorHandler.destroy()
  expect(remove).toHaveBeenCalledTimes(4)
  expect(frames.size).toBe(0)
  listeners.keyboardWillHide()
  listeners.keyboardDidHide()
  expect(virtualKeyboardStore.getState().height).toBe(height)
})

it('releases registrations that resolve after teardown', async () => {
  iOSCapacitorHandler.destroy()
  remove.mockClear()
  registration.defer = true
  iOSCapacitorHandler.init()
  iOSCapacitorHandler.destroy()
  registration.resolve.forEach(resolve => resolve({ remove }))
  await Promise.resolve()
  expect(remove).toHaveBeenCalledTimes(4)
})

// https://github.com/cybersemics/em/issues/4869
it('focuses the editable so WKWebView can keep the keyboard open after undo', () => {
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  document.body.appendChild(editable)
  iOSCapacitorHandler.show!(editable)
  expect(document.activeElement).toBe(editable)
  editable.remove()
})
