import _ from 'lodash'
import { isTouch } from '../browser'

// the number of pixels of scrolling or moving that are allowed to still trigger the tap event
const MOVE_THRESHOLD = 15

// disable touchend when scrolling
// allow 5px movement threshold
let touchStart = { x: 0, y: 0 }
let scrolling = false

if (isTouch) {
  window.addEventListener('touchstart', () => {
    scrolling = false
  })
  window.addEventListener(
    'scroll',
    _.throttle(() => {
      scrolling = true
    }, 16.666),
  )
}

/** A faster alternative to onClick or checkbox onChange. Returns onTouchEnd or onMouseUp handler depending on if touch is supported. Disabled on scroll (with 15px error tolerance). */
const fastClick = isTouch
  ? (tapUp: (e: React.TouchEvent) => void, tapDown?: (e: React.TouchEvent) => void) => ({
      onTouchStart: (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
          const x = e.touches[0].clientX
          const y = e.touches[0].clientY
          touchStart = { x, y }
        }

        tapDown?.(e)
      },
      onTouchEnd: (e: React.TouchEvent) => {
        let disable = scrolling

        if (e.changedTouches.length > 0) {
          const x = e.changedTouches[0].clientX
          const y = e.changedTouches[0].clientY
          if (Math.abs(touchStart.x - x) > MOVE_THRESHOLD || Math.abs(touchStart.y - y) > MOVE_THRESHOLD) {
            disable = true
          }
        }

        if (!disable) {
          tapUp(e)
        }

        scrolling = false
      },
    })
  : (tapUp: (e: React.MouseEvent) => void, tapDown?: (e: React.MouseEvent) => void) => ({
      onMouseUp: tapUp,
      ...(tapDown ? { onMouseDown: tapDown } : null),
    })

export default fastClick
