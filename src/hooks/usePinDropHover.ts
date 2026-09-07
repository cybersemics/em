import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { LongPressState } from '../constants'
import testFlags from '../e2e/testFlags'

/** Returns true if a drop hover should render. Normally this is just `isShown`, but when testFlags.pinDropHovers is enabled, any drop hover that has been shown during the current drag stays visible ("pinned") until the drag ends. This allows e2e snapshot tests to compare the relative position of multiple drop hovers in a single screenshot. See: https://github.com/cybersemics/em/issues/3115. */
const usePinDropHover = (isShown: boolean): boolean => {
  const [pinned, setPinned] = useState(false)

  const dragInProgress = useSelector(
    state => testFlags.pinDropHovers && state.longPress === LongPressState.DragInProgress,
  )

  useEffect(() => {
    if (!testFlags.pinDropHovers) return

    if (isShown && dragInProgress) {
      setPinned(true)
    } else if (!dragInProgress) {
      // Reset when the drag ends so a pinned drop hover does not leak into the next drag.
      setPinned(false)
    }
  }, [isShown, dragInProgress])

  return isShown || pinned
}

export default usePinDropHover
