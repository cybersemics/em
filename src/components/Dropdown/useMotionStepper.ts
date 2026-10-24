// PROTOTYPE — design-dials frame stepper, delete with DropdownDebugPanel once the motion is settled.
//
// Freezes the sort dropdown's animation so it can be stepped through a frame at a time. The dropdown's motion is all
// CSS transitions, which the browser exposes as Animation objects (document.getAnimations()). When the menu starts
// opening (or closing), useMotionStepper collects the transitions as they start over the next few frames, pauses
// each one, and lines them up on one shared timeline: a transition that started two frames after the first sits two
// frames later on it. Seeking sets every transition's currentTime from that timeline, so the real layers move
// together. Only CSS transitions are held: React's phase switches, the Dropdown's close timer that unmounts its
// layers, and the delayed sort all run on their own clock.
import { useEffect, useRef, useState } from 'react'
import storage from '../../util/storage'
import { DROPDOWN_OPENING_EVENT } from './dials'

/** Marks the dials' own elements (the panel, the floating button), whose transitions and taps the stepper ignores. */
export const DIALS_ROOT_ATTRIBUTE = 'data-sort-dropdown-dials'

/** One frame at 60fps (ms). */
export const FRAME_MS = 1000 / 60

/** Frames to keep looking for transitions after the trigger, before giving up if none start. */
const MAX_CAPTURE_FRAMES = 30

/** Frames without a new transition, after the first one, before the capture is considered complete. */
const QUIET_FRAMES = 4

const FREEZE_ON_OPEN_KEY = 'sortDropdownDials.freezeOnOpen'
const FREEZE_ON_CLOSE_KEY = 'sortDropdownDials.freezeOnClose'

/** Playback rates offered for Play. */
export const RATES = [
  { rate: 1, label: '1×' },
  { rate: 0.25, label: '¼×' },
  { rate: 0.1, label: '⅒×' },
]

/** A held transition and where it sits on the shared timeline. */
interface Track {
  animation: Animation
  /** When it started, relative to the earliest held transition (ms). */
  offset: number
  /** When it ends on the shared timeline, including its delay (ms). */
  end: number
}

export type Status = 'idle' | 'capturing' | 'frozen' | 'playing' | 'empty'

/** What the stepper's controls read and call. */
export interface MotionStepper {
  freezeOnOpen: boolean
  setFreezeOnOpen: (on: boolean) => void
  freezeOnClose: boolean
  setFreezeOnClose: (on: boolean) => void
  status: Status
  /** Position on the shared timeline (ms). */
  time: number
  /** Length of the shared timeline: the latest end among the held transitions (ms). */
  duration: number
  /** How many transitions are held. */
  count: number
  rate: number
  setRate: (rate: number) => void
  seek: (time: number) => void
  step: (frames: number) => void
  play: () => void
  pause: () => void
  /** Lets every held transition run to its end and forgets them. */
  release: () => void
  /** Holds whatever transitions are running right now, at their current positions. */
  freezeNow: () => void
}

/** True for a running CSS transition that isn't on the dials' own elements and isn't held already. */
const isHoldable = (animation: Animation, held: Set<Animation>) => {
  if (!(animation instanceof CSSTransition) || held.has(animation) || animation.playState !== 'running') return false
  const target = (animation.effect as KeyframeEffect | null)?.target
  return !target?.closest(`[${DIALS_ROOT_ATTRIBUTE}]`)
}

/** The current time on the document timeline (ms). */
const timelineNow = () => Number(document.timeline.currentTime ?? performance.now())

/**
 * Holds the sort dropdown's transitions on a shared timeline and steps through them. Call it from a component that
 * stays mounted (the panel), so freezing works while the controls are collapsed.
 */
const useMotionStepper = (): MotionStepper => {
  const [freezeOnOpen, setFreezeOnOpenState] = useState(() => storage.getItem(FREEZE_ON_OPEN_KEY) === 'true')
  const [freezeOnClose, setFreezeOnCloseState] = useState(() => storage.getItem(FREEZE_ON_CLOSE_KEY) === 'true')
  const [status, setStatus] = useState<Status>('idle')
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [rate, setRate] = useState(0.25)
  const tracks = useRef<Track[]>([])
  // The frame loop in progress: a capture, or playback.
  const frame = useRef(0)
  // The shared timeline's position, kept in a ref so the playback loop doesn't wait for a render.
  const timeRef = useRef(0)
  const rateRef = useRef(rate)
  rateRef.current = rate
  // True from the menu starting to open until a close is captured, so only taps that close the menu trigger it.
  const menuOpen = useRef(false)

  /** Moves every held transition to a point on the shared timeline. */
  const seek = (next: number) => {
    const clamped = Math.min(Math.max(0, next), duration || next)
    timeRef.current = clamped
    tracks.current.forEach(track => {
      // A transition React has since replaced is idle; reviving it would apply a stale style.
      if (track.animation.playState === 'idle') return
      track.animation.currentTime = Math.max(0, clamped - track.offset)
    })
    setTime(clamped)
  }

  /** Stops whatever frame loop is running. */
  const stopLoop = () => cancelAnimationFrame(frame.current)

  /**
   * Collects transitions as they start over the next frames and pauses each one. From the start: the timeline begins
   * at the earliest transition's first frame (opening, closing). Otherwise: it begins where they are now (Freeze now).
   */
  const capture = (fromStart: boolean) => {
    stopLoop()
    tracks.current = []
    const held = new Set<Animation>()
    const found: { animation: Animation; start: number }[] = []
    let frames = 0
    let quiet = 0
    let pausedAt = 0
    // When the capture began. Opening and closing only hold transitions that start after it, not ones that were
    // already running (the Command Universe's own, say), which would put the timeline's start too early.
    const triggeredAt = timelineNow()
    setStatus('capturing')

    /** Pauses the transitions that started since the last frame, then finishes or keeps looking. */
    const tick = () => {
      frames++
      const fresh = document
        .getAnimations()
        .filter(animation => isHoldable(animation, held))
        .filter(
          animation =>
            !fromStart || animation.startTime === null || Number(animation.startTime) >= triggeredAt - FRAME_MS,
        )
      fresh.forEach(animation => {
        held.add(animation)
        const now = timelineNow()
        found.push({ animation, start: animation.startTime === null ? now : Number(animation.startTime) })
        pausedAt = now
        animation.pause()
      })
      if (fresh.length) quiet = 0
      else if (found.length) quiet++

      // Hold the new ones at the start while collecting, so nothing runs on ahead.
      if (fromStart) found.forEach(({ animation }) => (animation.currentTime = 0))

      const done = (found.length && quiet >= QUIET_FRAMES) || frames >= MAX_CAPTURE_FRAMES || !fromStart
      if (!done) {
        frame.current = requestAnimationFrame(tick)
        return
      }
      if (!found.length) {
        setStatus('empty')
        return
      }
      const origin = Math.min(...found.map(f => f.start))
      tracks.current = found.map(({ animation, start }) => {
        const offset = start - origin
        const end = offset + Number(animation.effect?.getComputedTiming().endTime ?? 0)
        return { animation, offset, end }
      })
      const total = Math.max(...tracks.current.map(track => track.end))
      setDuration(total)
      setStatus('frozen')
      // Seek directly (not through seek(), whose clamp still sees the previous duration).
      const start = fromStart ? 0 : Math.min(total, pausedAt - origin)
      timeRef.current = start
      tracks.current.forEach(track => {
        track.animation.currentTime = Math.max(0, start - track.offset)
      })
      setTime(start)
    }
    frame.current = requestAnimationFrame(tick)
  }

  /** Plays the held transitions from the current position at the chosen rate, keeping them on the shared timeline. */
  const play = () => {
    if (!tracks.current.length) return
    stopLoop()
    // From the end, play again from the start.
    if (timeRef.current >= duration) seek(0)
    setStatus('playing')
    let last = performance.now()
    /** Advances the shared timeline by the real time since the last frame, scaled by the rate. */
    const tick = (now: number) => {
      const next = timeRef.current + (now - last) * rateRef.current
      last = now
      seek(Math.min(next, duration))
      if (next < duration) frame.current = requestAnimationFrame(tick)
      else setStatus('frozen')
    }
    frame.current = requestAnimationFrame(tick)
  }

  /** Stops playback where it is. */
  const pause = () => {
    stopLoop()
    if (tracks.current.length) setStatus('frozen')
  }

  /** Lets the held transitions finish on their own and clears the timeline. */
  const release = () => {
    stopLoop()
    tracks.current.forEach(track => {
      if (track.animation.playState !== 'idle') track.animation.play()
    })
    tracks.current = []
    timeRef.current = 0
    setTime(0)
    setDuration(0)
    setStatus('idle')
  }

  // Freeze on open: the Dropdown fires the event just before its layers mount; its transitions start two frames
  // later, when it switches to open.
  useEffect(() => {
    /** Notes that the menu is opening, and starts a capture if freezing on open. */
    const onOpening = () => {
      menuOpen.current = true
      if (freezeOnOpen) capture(true)
    }
    window.addEventListener(DROPDOWN_OPENING_EVENT, onOpening)
    return () => window.removeEventListener(DROPDOWN_OPENING_EVENT, onOpening)
    // capture reads only refs and setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freezeOnOpen])

  // Freeze on close: every tap outside the dials while the menu is open closes it (picking an option, tapping the
  // tap catcher, an action), so a tap starts a capture of the close.
  useEffect(() => {
    if (!freezeOnClose) return
    /** Captures the close that this tap starts, unless the tap was on the dials. */
    const onClick = (event: MouseEvent) => {
      if (!menuOpen.current) return
      if (event.composedPath().some(el => el instanceof Element && el.hasAttribute(DIALS_ROOT_ATTRIBUTE))) return
      menuOpen.current = false
      capture(true)
    }
    window.addEventListener('click', onClick, true)
    return () => window.removeEventListener('click', onClick, true)
    // capture reads only refs and setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freezeOnClose])

  // Stop any frame loop on unmount.
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  return {
    freezeOnOpen,
    setFreezeOnOpen: on => {
      storage.setItem(FREEZE_ON_OPEN_KEY, String(on))
      setFreezeOnOpenState(on)
    },
    freezeOnClose,
    setFreezeOnClose: on => {
      storage.setItem(FREEZE_ON_CLOSE_KEY, String(on))
      setFreezeOnCloseState(on)
    },
    status,
    time,
    duration,
    count: tracks.current.length,
    rate,
    setRate,
    seek: next => {
      stopLoop()
      if (tracks.current.length) setStatus('frozen')
      seek(next)
    },
    step: frames => {
      stopLoop()
      if (tracks.current.length) setStatus('frozen')
      // Snap to whole frames, so stepping from a scrubbed position lands on the frame grid.
      seek((Math.round(timeRef.current / FRAME_MS) + frames) * FRAME_MS)
    },
    play,
    pause,
    release,
    freezeNow: () => capture(false),
  }
}

export default useMotionStepper
