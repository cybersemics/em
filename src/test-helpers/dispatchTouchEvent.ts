/** A touch point as the app reads it. */
interface TouchPoint {
  identifier: number
  clientX: number
  clientY: number
  touchType?: 'direct' | 'stylus'
}

/**
 * Dispatches a bubbling, cancelable touch event on a target, defaulting to the body, and returns it. There is no Touch
 * constructor in jsdom, so the touch lists are defined on the event directly. `touches` defaults to `changedTouches`,
 * which is right for a touchstart or touchmove of the only finger down; pass the fingers still down for a touchend.
 */
const dispatchTouchEvent = (
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  changedTouches: TouchPoint[],
  { touches = changedTouches, target = document.body }: { touches?: TouchPoint[]; target?: EventTarget } = {},
): TouchEvent => {
  const event = new TouchEvent(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'changedTouches', { value: changedTouches })
  Object.defineProperty(event, 'touches', { value: touches })
  target.dispatchEvent(event)
  return event
}

export default dispatchTouchEvent
