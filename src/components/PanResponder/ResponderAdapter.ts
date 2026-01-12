/**
 * Minimal responder system adapter that converts DOM touch events
 * to React Native's PressEvent format for PanResponder.
 */
import type { NativeTouchEvent, PressEvent } from './CoreEventTypes'
import responderTouchHistoryStore from './ResponderTouchHistoryStore'

/**
 * Converts a DOM Touch to NativeTouchEvent format.
 */
function touchToNativeTouchEvent(touch: Touch, target: HTMLElement): NativeTouchEvent {
  const rect = target.getBoundingClientRect()
  // locationX/Y are relative to the element's coordinate system (like React Native)
  // pageX/pageY already account for scroll, so we just need element-relative position
  const locationX = touch.clientX - rect.left
  const locationY = touch.clientY - rect.top

  // Create a self-reference compatible NativeTouchEvent
  // touches and changedTouches will be populated by the caller

  return {
    identifier: touch.identifier,
    pageX: touch.pageX,
    pageY: touch.pageY,
    locationX,
    locationY,
    timestamp: Date.now(),
    target: target,
    force: (touch as Touch & { force?: number }).force || 0,
    touches: [],
    changedTouches: [],
  }
}

/**
 * Converts a TouchList to an array of NativeTouchEvent.
 */
function touchListToNativeTouches(touchList: TouchList, target: HTMLElement): NativeTouchEvent[] {
  const touches = Array.from(touchList).map(touch => touchToNativeTouchEvent(touch, target))
  // Update self-references after all touches are created
  type TouchWithRefs = NativeTouchEvent & { touches: NativeTouchEvent[]; changedTouches: NativeTouchEvent[] }
  touches.forEach(touch => {
    const touchWithRefs = touch as TouchWithRefs
    touchWithRefs.touches = touches
    touchWithRefs.changedTouches = touches
  })
  return touches
}

/**
 * Creates a PressEvent from a DOM TouchEvent.
 */
function createPressEventFromTouchEvent(
  event: TouchEvent | React.TouchEvent<HTMLElement>,
  target: HTMLElement,
): PressEvent {
  // Handle both DOM TouchEvent and React's SyntheticEvent
  const nativeTouchEvent = 'nativeEvent' in event ? (event.nativeEvent as TouchEvent) : event
  const touches = touchListToNativeTouches(nativeTouchEvent.touches, target)
  const changedTouches = touchListToNativeTouches(nativeTouchEvent.changedTouches, target)

  // Create the main native touch event (first touch)
  const mainTouch: NativeTouchEvent =
    touches[0] ||
    ({
      identifier: -1,
      pageX: 0,
      pageY: 0,
      locationX: 0,
      locationY: 0,
      timestamp: Date.now(),
      target,
      force: 0,
      touches,
      changedTouches,
    } as NativeTouchEvent)

  // Update self-references for all touches
  type TouchWithRefs = NativeTouchEvent & { touches: NativeTouchEvent[]; changedTouches: NativeTouchEvent[] }
  touches.forEach(touch => {
    const touchWithRefs = touch as TouchWithRefs
    touchWithRefs.touches = touches
    touchWithRefs.changedTouches = changedTouches
  })
  changedTouches.forEach(touch => {
    const touchWithRefs = touch as TouchWithRefs
    touchWithRefs.touches = touches
    touchWithRefs.changedTouches = changedTouches
  })
  const mainTouchWithRefs = mainTouch as TouchWithRefs
  mainTouchWithRefs.touches = touches
  mainTouchWithRefs.changedTouches = changedTouches

  // Update touch history store
  for (let i = 0; i < nativeTouchEvent.changedTouches.length; i++) {
    const touch = nativeTouchEvent.changedTouches[i]
    responderTouchHistoryStore.recordTouchTrack(touch.identifier, touch)
  }

  // Remove ended touches
  if (event.type === 'touchend' || event.type === 'touchcancel') {
    for (let i = 0; i < nativeTouchEvent.changedTouches.length; i++) {
      const touch = nativeTouchEvent.changedTouches[i]
      responderTouchHistoryStore.removeTouchTrack(touch.identifier)
    }
  }

  const touchHistory = responderTouchHistoryStore.getTouchHistory()

  // Create synthetic event
  const syntheticEvent: PressEvent = {
    bubbles: event.bubbles,
    cancelable: event.cancelable,
    currentTarget: target,
    defaultPrevented: event.defaultPrevented || false,
    dispatchConfig: {
      registrationName: `on${event.type.charAt(0).toUpperCase() + event.type.slice(1)}`,
    },
    eventPhase: event.eventPhase,
    preventDefault: () => event.preventDefault(),
    isDefaultPrevented: () => event.defaultPrevented || false,
    stopPropagation: () => event.stopPropagation(),
    isPropagationStopped: () => false,
    isTrusted: event.isTrusted,
    nativeEvent: {
      ...mainTouch,
      touches,
      changedTouches,
    },
    persist: () => {
      // No-op for web
    },
    target: (event.target || target) as HTMLElement,
    timeStamp: event.timeStamp || Date.now(),
    type: event.type,
    touchHistory,
  }

  return syntheticEvent
}

export default createPressEventFromTouchEvent
export { createPressEventFromTouchEvent }
