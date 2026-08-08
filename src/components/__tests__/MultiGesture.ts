import viewportStore from '../../stores/viewport'
import MultiGesture from '../MultiGesture'

/**
 * A point within the gesture zone of the default jsdom viewport (1024×768).
 * The gesture zone (right-handed) is x < innerWidth - scrollZoneWidth and y > TOOLBAR_HEIGHT.
 */
const gestureZonePoint = { clientX: 100, clientY: 400 }
/** A second point offset from the first, also within the gesture zone. */
const secondFingerPoint = { clientX: 140, clientY: 440 }

/** Dispatches a synthetic touch event on document.body with the given touch points. */
const dispatchTouch = (type: 'touchstart' | 'touchmove', touches: { clientX: number; clientY: number }[]): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  // jsdom does not construct TouchEvent.touches, so attach the touch list directly. MultiGesture only
  // reads touches.length and touches[0].clientX/clientY.
  Object.defineProperty(event, 'touches', { value: touches })
  document.body.dispatchEvent(event)
  return event
}

/**
 * MultiGesture registers its touch listeners on document.body in the constructor, so instantiating it is
 * enough to activate them. Returning it from a function avoids the no-new lint rule.
 */
const createMultiGesture = () => new MultiGesture({ minDistance: 10 })

describe('MultiGesture', () => {
  beforeAll(() => {
    // Pin the viewport so gestureZonePoint reliably falls within the gesture zone regardless of the
    // environment's default window size.
    viewportStore.update({ innerWidth: 1024, innerHeight: 768, scrollZoneWidth: 192 })
    createMultiGesture()
  })

  beforeEach(() => {
    // touchend resets disableScroll/abandon between scenarios (window 'touchend' → reset()).
    window.dispatchEvent(new Event('touchend'))
  })

  it('disables scroll for a single-finger touch in the gesture zone', () => {
    dispatchTouch('touchstart', [gestureZonePoint])
    const move = dispatchTouch('touchmove', [gestureZonePoint])
    // A single-finger gesture disables scroll by preventing the touchmove default.
    expect(move.defaultPrevented).toBe(true)
  })

  it('does not recognize a gesture when tracing with two fingers', () => {
    // Regression test for #4233: two-finger tracing must not be interpreted as a gesture.
    dispatchTouch('touchstart', [gestureZonePoint, secondFingerPoint])
    const move = dispatchTouch('touchmove', [gestureZonePoint, secondFingerPoint])
    // With two fingers the gesture is abandoned, so scroll is not disabled and no trace/menu/command is triggered.
    expect(move.defaultPrevented).toBe(false)
  })
})
