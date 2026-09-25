import KeyboardAnimationEvent from '../../../@types/KeyboardAnimationEvent'
import androidKeyboardAnimation from '../androidKeyboardAnimation'

const { listeners } = vi.hoisted(() => ({ listeners: {} as Record<string, (event: KeyboardAnimationEvent) => void> }))

vi.mock('../VirtualKeyboardTracker', () => ({
  default: {
    getClock: async () => ({ nativeMs: 1000 }),
    addListener: async (name: string, listener: (event: KeyboardAnimationEvent) => void) => {
      listeners[name] = listener
      return { remove: () => {} }
    },
  },
}))

/** Captures the browser effect contract; presentation is verified separately in Chromium. */
class Effect {
  constructor(
    readonly target: HTMLElement,
    public frames: Keyframe[],
    readonly options: KeyframeAnimationOptions,
  ) {}

  /** Replaces the curve without changing the animation clock. */
  setKeyframes(frames: Keyframe[]) {
    this.frames = frames
  }
}

const animations: BrowserAnimation[] = []

/** Implements the animation controls the coordinator uses. */
class BrowserAnimation {
  currentTime: number | null = null
  startTime: number | null = null
  cancelled = false

  constructor(readonly effect: Effect) {
    animations.push(this)
  }

  /** Records cancellation so detached anchors cannot keep animating. */
  cancel() {
    this.cancelled = true
  }
}

let detach: () => void
let anchor: HTMLDivElement

beforeEach(async () => {
  vi.useFakeTimers()
  vi.spyOn(performance, 'now').mockReturnValue(0)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('Animation', BrowserAnimation)
  vi.stubGlobal('KeyframeEffect', Effect)
  Object.defineProperty(document, 'timeline', { configurable: true, value: { currentTime: 0 } })
  document.documentElement.style.setProperty('--safe-area-inset-bottom', '39px')
  animations.length = 0
  androidKeyboardAnimation.init()
  await vi.runAllTimersAsync()
  anchor = document.createElement('div')
  anchor.style.transform = 'translateY(12px)'
  document.body.append(anchor)
  detach = androidKeyboardAnimation.attach(anchor)
})

afterEach(() => {
  detach()
  anchor.remove()
  androidKeyboardAnimation.destroy()
  document.documentElement.style.removeProperty('--safe-area-inset-bottom')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('anchors to native time and corrects a changing shown endpoint without restarting', () => {
  listeners.keyboardAnimation({
    id: 1,
    stage: 'start',
    fromHeight: 0,
    toHeight: 466,
    durationMs: 700,
    curve: [0, 0.5, 1],
  })
  listeners.keyboardAnimation({ id: 1, stage: 'anchor', fromHeight: 0, toHeight: 466, durationMs: 700, epochMs: 1100 })
  const animation = animations[0]
  expect(animation.startTime).toBe(100)
  expect(animation.effect.options.duration).toBe(700)
  androidKeyboardAnimation.progress({ phase: 'progress', height: 200, shownHeight: 425 })
  expect(animations).toHaveLength(1)
  expect(animation.startTime).toBe(100)
  expect(animation.effect.frames.at(-1)?.translate).toBe('0px -386px')
  expect(anchor.style.transform).toBe('translateY(12px)')
  listeners.keyboardAnimation({ id: 1, stage: 'end', fromHeight: 0, toHeight: 466, durationMs: 700 })
  expect(anchor.style.translate).toBe('0px -386px')
  expect(animation.cancelled).toBe(true)
})

it('ignores the end of a replaced animation and shares its clock with a late anchor', () => {
  listeners.keyboardAnimation({ id: 1, stage: 'start', fromHeight: 0, toHeight: 425, durationMs: 700, curve: [0, 1] })
  listeners.keyboardAnimation({ id: 2, stage: 'start', fromHeight: 200, toHeight: 0, durationMs: 600, curve: [0, 1] })
  listeners.keyboardAnimation({ id: 2, stage: 'anchor', fromHeight: 200, toHeight: 0, durationMs: 600, epochMs: 1200 })
  listeners.keyboardAnimation({ id: 1, stage: 'end', fromHeight: 0, toHeight: 425, durationMs: 700 })
  expect(animations[0].cancelled).toBe(true)
  expect(animations[1].cancelled).toBe(false)
  const late = document.createElement('div')
  const removeLate = androidKeyboardAnimation.attach(late)
  expect(animations[2].startTime).toBe(200)
  removeLate()
  expect(animations[2].cancelled).toBe(true)
  expect(late.style.translate).toBe('')
  androidKeyboardAnimation.progress({ phase: 'didHide', height: 0, shownHeight: 425 })
  expect(anchor.style.translate).toBe('0px 0px')
  expect(animations[1].cancelled).toBe(true)
})

it('uses measured geometry for zero-duration animation and never adds navigation twice', () => {
  listeners.keyboardAnimation({ id: 1, stage: 'start', fromHeight: 0, toHeight: 425, durationMs: 0, curve: [0, 1] })
  androidKeyboardAnimation.progress({ phase: 'didShow', height: 425, shownHeight: 425 })
  expect(animations).toHaveLength(0)
  expect(anchor.style.translate).toBe('0px -386px')
  androidKeyboardAnimation.progress({ phase: 'didHide', height: 0, shownHeight: 425 })
  expect(anchor.style.translate).toBe('0px 0px')
})
