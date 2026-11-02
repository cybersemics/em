import TouchMark from '../@types/TouchMark'

/** How far in px a touch can move and still count as a tap. */
const TAP_SLOP = 10

/** How long in ms a touch can be held and still count as a tap. */
const TAP_MAX = 300

/** How long in ms after one tap lifts the next can start and count as a double tap. Matches the double-tap window of iOS Safari: https://webkit.org/blog/5610/more-responsive-tapping-on-iOS/. */
const DOUBLE_TAP_INTERVAL = 350

/** How far in px the second tap of a double tap can start from where the first lifted. */
const DOUBLE_TAP_SLOP = 30

/** A point on screen at a time. */
interface TimedPoint {
  x: number
  y: number
  time: number
}

/** What trackTaps remembers between the primary touch's marks. */
export interface TapState {
  /** Where and when the primary touch started, or null while no touch is down. */
  start: TimedPoint | null
  /** Whether the primary touch has moved too far from its start to be a tap. */
  moved: boolean
  /** Where and when the last tap lifted, if it could still be the first tap of a double tap. */
  lastTap: TimedPoint | null
}

export const initialTapState: TapState = { start: null, moved: false, lastTap: null }

/** Distance between two points. */
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * Follows the primary touch's marks to tell when it completes a double tap: a tap that starts soon after, and close to,
 * where the previous tap lifted. Takes the type of the touch event that made the mark, since a dot is drawn for both a
 * touchstart and a touchmove. The second tap of a double tap does not start another one.
 */
const trackTaps = (
  state: TapState,
  type: string,
  mark: TouchMark,
  time: number,
): { state: TapState; doubleTap: boolean } => {
  if (type === 'touchstart') {
    return { state: { ...state, start: { x: mark.x, y: mark.y, time }, moved: false }, doubleTap: false }
  }

  if (!state.start) return { state, doubleTap: false }

  if (type === 'touchmove') {
    return { state: { ...state, moved: state.moved || distance(mark, state.start) > TAP_SLOP }, doubleTap: false }
  }

  const tap = type === 'touchend' && !state.moved && time - state.start.time <= TAP_MAX
  const doubleTap =
    tap &&
    !!state.lastTap &&
    state.start.time - state.lastTap.time <= DOUBLE_TAP_INTERVAL &&
    distance(state.start, state.lastTap) <= DOUBLE_TAP_SLOP

  return {
    state: { start: null, moved: false, lastTap: tap && !doubleTap ? { x: mark.x, y: mark.y, time } : null },
    doubleTap,
  }
}

export default trackTaps
