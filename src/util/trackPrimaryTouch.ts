import TouchMark from '../@types/TouchMark'

/** The fields of a Touch that Show Touches reads. Safari on iOS also sets touchType, which distinguishes an Apple Pencil from a finger. */
interface TouchLike {
  identifier: number
  clientX: number
  clientY: number
  touchType?: string
}

/** The fields of a TouchEvent that Show Touches reads. */
interface TouchEventLike {
  type: string
  touches: ArrayLike<TouchLike>
  changedTouches: ArrayLike<TouchLike>
}

/** Returns the touches that are fingers, leaving out a stylus. */
const fingers = (touches: ArrayLike<TouchLike>) => Array.from(touches).filter(touch => touch.touchType !== 'stylus')

/**
 * Follows the primary touch through one touch event: the finger that went down while no other finger was down. Returns
 * the primary touch's identifier after the event, and the mark to draw for it, if any. Other fingers and a stylus are
 * never drawn.
 *
 * A touchstart while no other finger is down always starts a new primary touch, even if the previous one never
 * reported its end. A touch whose target is removed mid-touch keeps sending its events to the detached element, where
 * no listener on window hears them, and since Android reuses touch identifiers, holding on to such a touch would
 * suppress the start of the next one.
 */
const trackPrimaryTouch = (
  primary: number | null,
  e: TouchEventLike,
): { primary: number | null; mark: TouchMark | null } => {
  if (e.type === 'touchstart') {
    const started = fingers(e.changedTouches)
    // another finger is already down, so the new one is not the primary touch
    if (started.length === 0 || fingers(e.touches).length !== started.length) return { primary, mark: null }
    const touch = started[0]
    return { primary: touch.identifier, mark: { kind: 'dot', x: touch.clientX, y: touch.clientY } }
  }

  const touch = Array.from(e.changedTouches).find(changed => changed.identifier === primary)
  if (!touch) return { primary, mark: null }

  return e.type === 'touchmove'
    ? { primary, mark: { kind: 'dot', x: touch.clientX, y: touch.clientY } }
    : { primary: null, mark: { kind: 'ring', x: touch.clientX, y: touch.clientY } }
}

export default trackPrimaryTouch
