import { useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { showPinnedCommandTooltipActionCreator as showPinnedCommandTooltip } from '../../actions/showPinnedCommandTooltip'

/**
 * The pinned command tooltip's open state, which lives in Redux, and the ways it closes without the tooltip's own
 * controls: Escape, a rep landing, and the widget unmounting.
 */
const usePinnedCommandTooltip = ({ reps }: { reps: number }) => {
  const dispatch = useDispatch()
  // Changing the pinned command also closes the tooltip for any previous pinned command that might be open.
  const isOpen = useSelector(state => state.showPinnedCommandTooltip && !!state.learning.pinnedCommandId)
  const close = useCallback(() => dispatch(showPinnedCommandTooltip({ value: false })), [dispatch])
  const toggle = useCallback(() => dispatch(showPinnedCommandTooltip({ value: !isOpen })), [dispatch, isOpen])

  // Close the tooltip when the widget disappears. A modal (such as Settings) replaces the widget while it is open, and
  // the tooltip should not reappear when the modal closes.
  useEffect(() => close, [close])

  useEffect(() => {
    if (!isOpen) return
    /** Closes the tooltip from the keyboard without changing the pin. */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [close, isOpen])

  // A rep earned while the tooltip is open means the user traced the gesture it was showing. The tooltip has done its
  // job, so it closes; the rep itself is already counted.
  const previousReps = useRef(reps)
  useEffect(() => {
    const repLanded = reps > previousReps.current
    previousReps.current = reps
    if (repLanded && isOpen) close()
  }, [close, isOpen, reps])

  return { isOpen, close, toggle }
}

export default usePinnedCommandTooltip
