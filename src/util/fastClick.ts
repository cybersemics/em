import _ from 'lodash'
import React from 'react'
import { isTouch } from '../browser'
import haptics from './haptics'

/** A faster alternative to onClick or checkbox onChange. Activates on mouseUp/touchEnd to avoid interfering with mobile scroll. Returns onTouchStart/Move/End or onMouseUp handler depending on if touch is supported. Cancelled on scroll (with 15px error tolerance). */
const fastClick = (
  // triggered on mouseup or touchend
  // cancelled if the user scroll or drags
  tapUp: (e: React.MouseEvent<Element, MouseEvent>) => void,
  {
    // whether to trigger haptics on tap
    enableHaptics = true,
    // triggered on mousedown or touchstart
    tapDown,
    // triggered with touchMove, which can never be a MouseEvent
    touchMove,
  }: {
    enableHaptics?: boolean
    tapDown?: (e: React.MouseEvent | React.TouchEvent) => void
    touchMove?: (e: React.TouchEvent) => void
  } = {},
) => ({
  onMouseDown: isTouch ? undefined : tapDown,
  onTouchStart: isTouch ? tapDown : undefined,
  onTouchMove: isTouch ? touchMove : undefined,
  onClick: (e: React.MouseEvent) => {
    if (enableHaptics) {
      haptics.light()
    }

    tapUp(e)
  },
  role: 'button',
})

export default fastClick
