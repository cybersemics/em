import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { showPinnedCommandTooltipActionCreator as showPinnedCommandTooltip } from '../../actions/showPinnedCommandTooltip'

/**
 * The pinned command tooltip's open state, which lives in Redux, and the two ways it closes without the tooltip's own
 * controls: Escape, and the widget unmounting.
 */
const usePinnedCommandTooltip = () => {
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

  return { isOpen, close, toggle }
}

export default usePinnedCommandTooltip
