import { TIMEOUT_LONG_PRESS_THOUGHT } from '../constants'
import debugLog from '../util/debugLog'

/** How often a touch is sampled while it is open. */
const SAMPLE_INTERVAL = 100

/** How long a touch must stay open before its samples are logged. Past the long-press delay, so that only touches
 * that could have become a DragHold are recorded, and an ordinary tap adds nothing to the log. */
const HOLD_THRESHOLD = TIMEOUT_LONG_PRESS_THOUGHT + 100

/** Sampling stops after this long, so a touch whose end never arrives does not sample forever. */
const MAX_DURATION = 30000

/** Events that might mark the lift of a touch whose touchend iOS 27 withholds. Mouse events are included because iOS
 * still fires mouseup for most withheld taps, though not, per #5660, for a held finger. */
const LIFT_EVENTS = [
  'pointerup',
  'pointercancel',
  'lostpointercapture',
  'gotpointercapture',
  'pointerleave',
  'pointerout',
  'mouseup',
] as const

/** What a sample reads from the open touch. */
type Sample = {
  /** Whether the touched element still matches :active. */
  active: boolean
  /** Whether the touched element is still in the document. */
  connected: boolean
  force: number
  radiusX: number
  radiusY: number
}

/** An open touch being sampled. */
type Probe = {
  start: number
  target: Element | null
  /** The latest Touch object seen for the finger: the touchstart's, then each touchmove's. */
  touch: Touch
  interval: ReturnType<typeof setInterval>
  /** The last sample, serialized, so that only changes are logged. */
  last: string
  /** Whether the hold entry has been written, after which every change and event is logged as it happens. */
  logged: boolean
  /** Lift events seen before the hold entry was written, so that an event at the moment of a quick lift is not lost. */
  early: string[]
}

/**
 * Records, in the debug log, what the page can observe of a held touch between the moment it starts and the moment
 * its touchend arrives. On iOS 27, a touch that starts near the caret has every event after touchstart withheld until
 * the next touch begins (#5660, #5895), so a long press there leaves drag and drop active after the finger lifts, and
 * no event says when it did. This probe tests three candidate signals for the lift: the touched element's :active
 * state, the touch's force and radius, and pointer capture and leave events. A log of a stuck drag then shows whether
 * any of them changed when the finger lifted, seconds before the withheld touchend.
 *
 * Nothing is sampled or logged while debug logging is off. While it is on, a touch is sampled every 100ms until it
 * ends. A sample matches one selector and reads four properties of a Touch object, with no layout. Unmeasured.
 */
const initTouchLiftProbe = () => {
  let probe: Probe | null = null

  /** Reads the open touch's current state. */
  const sample = (target: Element | null, touch: Touch): Sample => ({
    active: !!target?.matches(':active'),
    connected: !!target?.isConnected,
    force: Math.round(touch.force * 100) / 100,
    radiusX: Math.round(touch.radiusX * 10) / 10,
    radiusY: Math.round(touch.radiusY * 10) / 10,
  })

  /** Stops sampling, and logs how the touch ended if it was held long enough to be logged. */
  const stop = (end: 'touchend' | 'touchcancel' | 'nextTouch' | 'timeout') => {
    if (!probe) return
    const { start, target, touch, interval, logged } = probe
    clearInterval(interval)
    probe = null
    if (logged) {
      debugLog.log('liftProbe', () => ({
        phase: 'end',
        end,
        ms: Math.round(performance.now() - start),
        ...sample(target, touch),
      }))
    }
  }

  /** Samples the open touch, logging the first sample once the touch is held and every change after it. */
  const tick = () => {
    const open = probe
    if (!open) return
    const ms = performance.now() - open.start
    if (ms > MAX_DURATION || !debugLog.isEnabled()) {
      stop('timeout')
      return
    }
    const current = sample(open.target, open.touch)
    const serialized = JSON.stringify(current)
    if (ms >= HOLD_THRESHOLD && !open.logged) {
      debugLog.log('liftProbe', () => ({ phase: 'hold', ms: Math.round(ms), ...current, events: open.early }))
      open.logged = true
    } else if (open.logged && serialized !== open.last) {
      debugLog.log('liftProbe', () => ({ phase: 'change', ms: Math.round(ms), ...current }))
    }
    open.last = serialized
  }

  /** Starts sampling a first finger. A probe still open belongs to a touch whose end never arrived. */
  const onTouchStart = (e: TouchEvent) => {
    if (!debugLog.isEnabled()) return
    if (probe) stop('nextTouch')
    const touch = e.changedTouches[0]
    if (e.touches.length !== 1 || !touch) return
    const target = e.target instanceof Element ? e.target : null
    probe = {
      start: performance.now(),
      target,
      touch,
      interval: setInterval(tick, SAMPLE_INTERVAL),
      last: JSON.stringify(sample(target, touch)),
      logged: false,
      early: [],
    }
  }

  /** Keeps the latest Touch object for the probed finger, in case iOS does not update the touchstart's in place. */
  const onTouchMove = (e: TouchEvent) => {
    if (!probe) return
    const identifier = probe.touch.identifier
    const touch = Array.from(e.changedTouches).find(t => t.identifier === identifier)
    if (touch) probe.touch = touch
  }

  /** Stops sampling once every finger is up. */
  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) stop(e.type === 'touchcancel' ? 'touchcancel' : 'touchend')
  }

  /** Logs a candidate lift event while a touch is open: at once if the touch is held, else with the hold entry. */
  const onLiftEvent = (e: Event) => {
    if (!probe) return
    const ms = Math.round(performance.now() - probe.start)
    if (probe.logged) {
      debugLog.log('liftProbe', { phase: e.type, ms })
    } else {
      probe.early.push(`${e.type}@${ms}`)
    }
  }

  // Capture phase, so that no handler can stop the event first, and so that pointerleave, which does not bubble, is
  // heard on window.
  window.addEventListener('touchstart', onTouchStart, { capture: true })
  window.addEventListener('touchmove', onTouchMove, { capture: true })
  window.addEventListener('touchend', onTouchEnd, { capture: true })
  window.addEventListener('touchcancel', onTouchEnd, { capture: true })
  LIFT_EVENTS.forEach(type => window.addEventListener(type, onLiftEvent, { capture: true }))

  return () => {
    stop('timeout')
    window.removeEventListener('touchstart', onTouchStart, { capture: true })
    window.removeEventListener('touchmove', onTouchMove, { capture: true })
    window.removeEventListener('touchend', onTouchEnd, { capture: true })
    window.removeEventListener('touchcancel', onTouchEnd, { capture: true })
    LIFT_EVENTS.forEach(type => window.removeEventListener(type, onLiftEvent, { capture: true }))
  }
}

export default initTouchLiftProbe
