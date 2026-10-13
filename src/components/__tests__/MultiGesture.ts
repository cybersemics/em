import viewportStore from '../../stores/viewportStore'
import debugLog from '../../util/debugLog'
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

/** Dispatches a synthetic touchend on window with every finger up. */
const dispatchTouchEnd = () => {
  const touchend = new Event('touchend')
  // jsdom does not construct TouchEvent.changedTouches or touches, which the touchend listener reads. An empty
  // touches list means every finger is up.
  Object.defineProperty(touchend, 'changedTouches', { value: [] })
  Object.defineProperty(touchend, 'touches', { value: [] })
  window.dispatchEvent(touchend)
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
    dispatchTouchEnd()
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

  describe('debug log', () => {
    beforeEach(() => {
      debugLog.setEnabled(true)
      debugLog.clear()
    })

    afterEach(() => {
      document.body.replaceChildren()
      vi.useRealTimers()
    })

    // A touch that iOS swallows gets no touchmove at all (#4222).
    it('records how many touchmoves a touch received', () => {
      dispatchTouch('touchstart', [gestureZonePoint])
      dispatchTouch('touchmove', [gestureZonePoint])
      dispatchTouch('touchmove', [secondFingerPoint])
      dispatchTouchEnd()
      dispatchTouch('touchstart', [gestureZonePoint])
      dispatchTouchEnd()

      expect(debugLog.read().filter(entry => entry.type === 'touchend')).toMatchObject([{ moves: 2 }, { moves: 0 }])
    })

    it('records the caret and the thought being edited on the frame after a touch begins', () => {
      vi.useFakeTimers({ toFake: ['requestAnimationFrame'] })
      const editable = document.createElement('div')
      editable.setAttribute('data-editable', 'true')
      editable.setAttribute('contenteditable', 'true')
      document.body.appendChild(editable)
      editable.focus()

      dispatchTouch('touchstart', [gestureZonePoint])
      expect(debugLog.read().some(entry => entry.type === 'touchCaret')).toBe(false)

      vi.advanceTimersToNextFrame()
      // jsdom has no layout, so the geometry is all zeros; the entry's presence and shape is what is under test.
      expect(debugLog.read().filter(entry => entry.type === 'touchCaret')).toMatchObject([
        { x: 0, y: 0, editableLeft: 0, editableTop: 0, editableRight: 0, editableBottom: 0 },
      ])
    })

    it('records no caret when no thought is being edited', () => {
      vi.useFakeTimers({ toFake: ['requestAnimationFrame'] })
      dispatchTouch('touchstart', [gestureZonePoint])
      vi.advanceTimersToNextFrame()
      expect(debugLog.read().some(entry => entry.type === 'touchCaret')).toBe(false)
    })
  })
})
