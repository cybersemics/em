import _ from 'lodash'
import { isTouch } from '../browser'

// the number of pixels of scrolling or dragging from touchStart that is allowed to still trigger fastClick
const MOVE_THRESHOLD = 15

// track the touch start coordinates
let touchStart: { x: number; y: number } | null = null

/** A faster alternative to onClick or checkbox onChange. Activates on mouseUp/touchEnd to avoid interfering with mobile scroll. Returns onTouchStart/Move/End or onMouseUp handler depending on if touch is supported. Cancelled on scroll (with 15px error tolerance). */
const fastClick = isTouch
  ? (
      // triggered on mouseup or touchend
      // cancelled if the user scroll or drags
      tapUp: (e: React.TouchEvent) => void,
      // triggered on mousedown or touchstart
      tapDown?: (e: React.TouchEvent) => void,
      // triggered when tapUp is cancelled due to scrolling or dragging
      // does not work with drag-and-drop on desktop (onMouseUp does not trigger)
      tapCancel?: (e: React.TouchEvent) => void,
      // triggered with touchMove
      touchMove?: (e: React.TouchEvent) => void,
    ) => ({
      onTouchStart: (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
          const x = e.touches[0].clientX
          const y = e.touches[0].clientY
          touchStart = { x, y }
        }

        tapDown?.(e)
      },
      // cancel tap if touchmove exceeds threshold (e.g. with scrolling or dragging)
      onTouchMove: _.throttle((e: React.TouchEvent) => {
        touchMove?.(e)
        if (touchStart && e.changedTouches.length > 0) {
          const x = e.changedTouches[0].clientX
          const y = e.changedTouches[0].clientY
          if (Math.abs(touchStart.x - x) > MOVE_THRESHOLD || Math.abs(touchStart.y - y) > MOVE_THRESHOLD) {
            touchStart = null
          }
        }
      }, 16.666),
      onTouchEnd: (e: React.TouchEvent) => {
        let cancel = !touchStart

        if (touchStart && e.changedTouches.length > 0) {
          const x = e.changedTouches[0].clientX
          const y = e.changedTouches[0].clientY
          if (Math.abs(touchStart.x - x) > MOVE_THRESHOLD || Math.abs(touchStart.y - y) > MOVE_THRESHOLD) {
            cancel = true
          }
        }

        if (cancel) {
          tapCancel?.(e)
        } else {
          tapUp(e)
        }

        touchStart = null
      },
    })
  : (tapUp: (e: React.MouseEvent) => void, tapDown?: (e: React.MouseEvent) => void) => ({
      onMouseUp: tapUp,
      ...(tapDown ? { onMouseDown: tapDown } : null),
    })

export default fastClick
