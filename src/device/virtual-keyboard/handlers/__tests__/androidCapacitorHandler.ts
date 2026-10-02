import AndroidKeyboardAnimationEvent from '../../../../@types/AndroidKeyboardAnimationEvent'
import virtualKeyboardStore from '../../../../stores/virtualKeyboardStore'
import androidCapacitorHandler from '../androidCapacitorHandler'

const { bridge, listeners, availability, remove } = vi.hoisted(() => {
  const listeners = {} as Record<string, (event: AndroidKeyboardAnimationEvent | { keyboardHeight: number }) => void>
  const remove = vi.fn(async () => {})
  return {
    listeners,
    availability: { native: true },
    remove,
    bridge: {
      getClock: vi.fn(async () => ({ nativeMs: 1000 })),
      getState: vi.fn(async () => ({ height: 0 })),
      addListener: vi.fn(async (name: string, listener: (event: AndroidKeyboardAnimationEvent) => void) => {
        listeners[name] = listener as (event: AndroidKeyboardAnimationEvent | { keyboardHeight: number }) => void
        return { remove }
      }),
    },
  }
})

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'android',
    isNativePlatform: () => true,
    isPluginAvailable: (name: string) => name === 'Keyboard' || availability.native,
  },
  registerPlugin: () => bridge,
}))
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: async (name: string, listener: (event: { keyboardHeight: number }) => void) => {
      listeners[name] = listener as (event: AndroidKeyboardAnimationEvent | { keyboardHeight: number }) => void
      return { remove }
    },
  },
}))

const frames = new Map<number, FrameRequestCallback>()
let nextFrame = 0

/** Advances the browser frame clock without delivering another native keyboard event. */
const renderFrame = (time: number) => {
  const callbacks = [...frames.values()]
  if (!callbacks.length) throw new Error('No keyboard animation frame scheduled')
  frames.clear()
  callbacks.forEach(callback => callback(time))
}

beforeEach(async () => {
  vi.useFakeTimers()
  vi.spyOn(performance, 'now').mockReturnValue(0)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback)
    return nextFrame
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  availability.native = true
  frames.clear()
  remove.mockClear()
  bridge.getClock.mockClear()
  virtualKeyboardStore.reset()
  document.documentElement.style.setProperty('--safe-area-inset-bottom', '40px')
  androidCapacitorHandler.init()
  await vi.runAllTimersAsync()
})

afterEach(() => {
  androidCapacitorHandler.destroy()
  frames.clear()
  document.documentElement.style.removeProperty('--safe-area-inset-bottom')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('reconstructs intermediate store heights locally from the system curve and clock', () => {
  listeners.keyboardAnimation({
    id: 1,
    stage: 'start',
    fromHeight: 0,
    toHeight: 400,
    durationMs: 400,
    curve: [0, 0.25, 1],
  })
  listeners.keyboardAnimation({ id: 1, stage: 'anchor', toHeight: 400, epochMs: 1000 })
  renderFrame(100)
  expect(virtualKeyboardStore.getState()).toMatchObject({ height: 10, open: true, phase: 'opening' })
  renderFrame(200)
  expect(virtualKeyboardStore.getState().height).toBe(60)
  renderFrame(300)
  expect(virtualKeyboardStore.getState().height).toBe(210)
  renderFrame(400)
  expect(virtualKeyboardStore.getState().height).toBe(360)
  listeners.keyboardAnimation({ id: 1, stage: 'end', toHeight: 400 })
  expect(virtualKeyboardStore.getState()).toMatchObject({ height: 360, open: true, phase: 'open' })
})

it('uses the original epoch when an anchor arrives late and an endpoint changes', () => {
  listeners.keyboardAnimation({ id: 1, stage: 'start', fromHeight: 0, toHeight: 466, durationMs: 400, curve: [0, 1] })
  listeners.keyboardAnimation({ id: 1, stage: 'geometry', toHeight: 425 })
  listeners.keyboardAnimation({ id: 1, stage: 'anchor', toHeight: 425, epochMs: 1000 })
  renderFrame(200)
  expect(virtualKeyboardStore.getState().height).toBe(172.5)
  renderFrame(300)
  expect(virtualKeyboardStore.getState().height).toBe(278.75)
  listeners.keyboardAnimation({ id: 1, stage: 'end', toHeight: 425 })
  expect(virtualKeyboardStore.getState().height).toBe(385)
})

it('keeps the keyboard visible through an interrupted close and ignores stale completion', () => {
  listeners.keyboardAnimation({ id: 1, stage: 'start', fromHeight: 0, toHeight: 400, durationMs: 400, curve: [0, 1] })
  listeners.keyboardAnimation({ id: 1, stage: 'anchor', toHeight: 400, epochMs: 1000 })
  renderFrame(200)
  listeners.keyboardAnimation({ id: 2, stage: 'start', fromHeight: 200, toHeight: 0, durationMs: 200, curve: [0, 1] })
  listeners.keyboardAnimation({ id: 2, stage: 'anchor', toHeight: 0, epochMs: 1200 })
  listeners.keyboardAnimation({ id: 1, stage: 'end', toHeight: 400 })
  renderFrame(300)
  expect(virtualKeyboardStore.getState()).toMatchObject({ height: 60, open: true, phase: 'closing' })
  renderFrame(390)
  expect(virtualKeyboardStore.getState()).toMatchObject({ height: 0, open: true, phase: 'closing' })
  listeners.keyboardAnimation({ id: 2, stage: 'end', toHeight: 0 })
  expect(virtualKeyboardStore.getState()).toMatchObject({ height: 0, open: false, phase: 'closed' })
})

it('publishes zero-duration geometry without scheduling an animation', () => {
  listeners.keyboardAnimation({ id: 1, stage: 'start', fromHeight: 0, toHeight: 425, durationMs: 0, curve: [0, 1] })
  expect(virtualKeyboardStore.getState().height).toBe(385)
  expect(frames.size).toBe(0)
  listeners.keyboardAnimation({ id: 1, stage: 'end', toHeight: 425 })
  expect(virtualKeyboardStore.getState().phase).toBe('open')
})

it('cancels frames and ignores callbacks after teardown', () => {
  listeners.keyboardAnimation({ id: 1, stage: 'start', fromHeight: 0, toHeight: 400, durationMs: 400, curve: [0, 1] })
  listeners.keyboardAnimation({ id: 1, stage: 'anchor', toHeight: 400, epochMs: 1000 })
  renderFrame(200)
  androidCapacitorHandler.destroy()
  expect(frames.size).toBe(0)
  expect(remove).toHaveBeenCalledTimes(1)
  listeners.keyboardAnimation({ id: 1, stage: 'end', toHeight: 400 })
  expect(virtualKeyboardStore.getState().height).toBe(160)
})

it('reports older Android lifecycle endpoints through the same store', async () => {
  androidCapacitorHandler.destroy()
  availability.native = false
  bridge.getClock.mockClear()
  androidCapacitorHandler.init()
  await vi.runAllTimersAsync()
  listeners.keyboardWillShow({ keyboardHeight: 400 })
  expect(virtualKeyboardStore.getState()).toMatchObject({ open: true, phase: 'opening' })
  listeners.keyboardDidShow({ keyboardHeight: 400 })
  expect(virtualKeyboardStore.getState()).toMatchObject({ height: 360, open: true, phase: 'open' })
  listeners.keyboardWillHide({ keyboardHeight: 0 })
  expect(virtualKeyboardStore.getState()).toMatchObject({ height: 360, open: true, phase: 'closing' })
  listeners.keyboardDidHide({ keyboardHeight: 0 })
  expect(virtualKeyboardStore.getState()).toMatchObject({ height: 0, open: false, phase: 'closed' })
  expect(bridge.getClock).not.toHaveBeenCalled()
})

it('accepts completion when initialization missed the start of an animation', () => {
  expect(virtualKeyboardStore.getState().phase).toBeUndefined()
  listeners.keyboardAnimation({ id: 5, stage: 'end', toHeight: 400 })
  expect(virtualKeyboardStore.getState()).toMatchObject({ height: 360, open: true, phase: 'open' })
})
