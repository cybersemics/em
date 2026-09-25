import KeyboardAnimationEvent from '../../@types/KeyboardAnimationEvent'
import VirtualKeyboardTracker from './VirtualKeyboardTracker'
import getSafeAreaBottom from './getSafeAreaBottom'

interface Anchor {
  element: HTMLElement
  previousTranslate: string
  animation?: Animation
}

interface Motion {
  id: number
  from: number
  to: number
  curve: number[]
  duration: number
  startTime?: number
}

const anchors = new Map<HTMLElement, Anchor>()
let motion: Motion | null = null
let height = 0
let clockOffset: number | null = null
let generation = 0
let timelineOffset = 0

/** Converts an IME inset to displacement above the resting navigation safe area. */
const translate = (inset: number, safe: number) => `0px ${-Math.max(0, inset - safe)}px`

/** Finishes or replaces a motion without leaving a fill animation attached to an element. */
const settle = (inset: number) => {
  height = inset
  motion = null
  const safe = getSafeAreaBottom()
  anchors.forEach(anchor => {
    anchor.element.style.translate = translate(inset, safe)
    anchor.animation?.cancel()
    anchor.animation = undefined
  })
}

/** Installs a motion on an anchor, including anchors mounted after the animation began. */
const animate = (anchor: Anchor, current: Motion) => {
  anchor.animation?.cancel()
  const safe = getSafeAreaBottom()
  const frames = current.curve.map((fraction, i) => ({
    offset: i / (current.curve.length - 1),
    translate: translate(current.from + fraction * (current.to - current.from), safe),
  }))
  anchor.animation = new Animation(
    new KeyframeEffect(anchor.element, frames, { duration: current.duration, fill: 'both', easing: 'linear' }),
    document.timeline,
  )
  anchor.animation.currentTime = 0
  if (current.startTime !== undefined) anchor.animation.startTime = current.startTime
}

/** Updates a live endpoint without restarting the system clock or seeking the animation. */
const updateTarget = (target: number) => {
  if (!motion || motion.to <= 0 || target <= 0 || target === motion.to) return
  motion.to = target
  const current = motion
  const safe = getSafeAreaBottom()
  anchors.forEach(anchor => {
    const effect = anchor.animation?.effect as KeyframeEffect | null
    effect?.setKeyframes(
      current.curve.map((fraction, i) => ({
        offset: i / (current.curve.length - 1),
        translate: translate(current.from + fraction * (current.to - current.from), safe),
      })),
    )
  })
}

/** Applies system animation metadata independently of bridge delivery cadence. */
const receive = (event: KeyboardAnimationEvent) => {
  if (event.stage === 'start') {
    settle(event.fromHeight)
    if (clockOffset === null || !event.curve || event.curve.length < 2 || event.durationMs <= 0) return
    motion = {
      id: event.id,
      from: event.fromHeight,
      to: event.toHeight,
      curve: event.curve,
      duration: event.durationMs,
    }
    const current = motion
    anchors.forEach(anchor => animate(anchor, current))
  } else if (
    motion?.id === event.id &&
    event.stage === 'anchor' &&
    event.epochMs !== undefined &&
    clockOffset !== null
  ) {
    motion.startTime = event.epochMs - clockOffset - timelineOffset
    const startTime = motion.startTime
    anchors.forEach(anchor => {
      if (anchor.animation) anchor.animation.startTime = startTime
    })
  } else if (motion?.id === event.id && event.stage === 'end') {
    settle(motion.to)
  }
}

/** Shares the native keyboard's curve and clock between bottom-fixed DOM controls. */
const androidKeyboardAnimation = {
  /** Calibrates clocks using the lowest round-trip sample; older APKs keep raw positioning. */
  init: () => {
    const currentGeneration = ++generation
    VirtualKeyboardTracker.addListener('keyboardAnimation', event => {
      if (generation === currentGeneration) receive(event)
    })
    /** Collects clock samples without blocking input while the native bridge responds. */
    const calibrate = async () => {
      let bestRoundTrip = Infinity
      let bestOffset = 0
      for (let i = 0; i < 30 && generation === currentGeneration; i++) {
        const before = performance.now()
        const reply = await VirtualKeyboardTracker.getClock()
        const after = performance.now()
        if (after - before < bestRoundTrip) {
          bestRoundTrip = after - before
          bestOffset = reply.nativeMs - (before + after) / 2
        }
        await new Promise(resolve => setTimeout(resolve, 8))
      }
      const offset = await new Promise<number>(resolve =>
        requestAnimationFrame(time => resolve(time - Number(document.timeline.currentTime))),
      )
      if (generation === currentGeneration) {
        timelineOffset = offset
        clockOffset = bestOffset
      }
    }
    // A web update can run inside an older installed APK without the metadata API.
    void calibrate().catch(() => {})
  },
  /** Registers a compositor anchor and restores its previous translation on unmount. */
  attach: (element: HTMLElement) => {
    const anchor: Anchor = { element, previousTranslate: element.style.translate }
    anchors.set(element, anchor)
    element.style.translate = translate(height, getSafeAreaBottom())
    if (motion) animate(anchor, motion)
    return () => {
      anchor.animation?.cancel()
      element.style.translate = anchor.previousTranslate
      anchors.delete(element)
    }
  },
  /** Reconciles lifecycle endpoints and provides raw positioning when metadata is unavailable. */
  progress: (event: { phase: string; height: number; shownHeight: number }) => {
    height = event.height
    if (event.phase === 'didShow' || event.phase === 'didHide') settle(event.height)
    else if (motion) {
      if (event.phase === 'progress') updateTarget(event.shownHeight)
    } else {
      const safe = getSafeAreaBottom()
      anchors.forEach(anchor => {
        anchor.element.style.translate = translate(height, safe)
      })
    }
  },
  /** Cancels active motion and invalidates in-flight calibration during handler teardown. */
  destroy: () => {
    generation++
    clockOffset = null
    settle(0)
  },
}

export default androidKeyboardAnimation
