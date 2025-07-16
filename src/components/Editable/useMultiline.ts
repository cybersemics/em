import { head, isEqual } from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import useLayoutAnimationFrameEffect from '../../hooks/useLayoutAnimationFrameEffect'
import useSelectorEffect from '../../hooks/useSelectorEffect'
import getStyle from '../../selectors/getStyle'
import getThoughtById from '../../selectors/getThoughtById'
import editingValueStore from '../../stores/editingValue'
import viewportStore, { ViewportState } from '../../stores/viewport'

/** Selects the cursor from the state. */
const selectCursor = (state: State) => state.cursor

/** Returns true if the element has more than one line of text. */
const useMultiline = (contentRef: React.RefObject<HTMLElement>, simplePath: SimplePath, isEditing: boolean) => {
  const [multiline, setMultiline] = useState(false)
  const fontSize = useSelector(state => state.fontSize)
  // While editing, watch the current Value and trigger the layout effect
  const editingValue = editingValueStore.useSelector(state => (isEditing ? state : null))

  /** Measure the contentRef to determine if it needs to be multiline. */
  const updateMultiline = useCallback(() => {
    if (!contentRef.current) return
    const height = contentRef.current.getBoundingClientRect().height
    // must match line-height as defined in thought-container
    const singleLineHeight = fontSize * 2
    // .editable.multiline gets 5px of padding-top to offset the collapsed line-height
    // we need to account for padding-top, otherwise it can cause a false positive
    const style = window.getComputedStyle(contentRef.current)
    const paddingTop = parseInt(style.paddingTop)
    const paddingBottom = parseInt(style.paddingBottom)
    // 2x the single line height would indicate that the thought was multiline if it weren't for the change in line-height and padding.
    // 1.2x is used for a more forgiving condition.
    // 1.5x can cause multiline to alternate in Safari for some reason. There may be a mistake in the height calculation or the inclusion of padding that is causing this. Padding was added to the calculation in commit 113c692. Further investigation is needed.
    // See: https://github.com/cybersemics/em/issues/2778#issuecomment-2605083798
    setMultiline(height - paddingTop - paddingBottom > singleLineHeight * 1.2)
  }, [fontSize, contentRef])

  // Recalculate multiline on mount, when the font size changes, edit, split view resize, value changes, and when the
  // cursor changes to or from the element.
  useLayoutAnimationFrameEffect(updateMultiline, [fontSize, isEditing, simplePath, editingValue])

  // Recalculate multiline when the cursor changes.
  // This is necessary because the width of thoughts change as the autofocus indent changes.
  // (do not re-render component unless multiline changes)
  useSelectorEffect(updateMultiline, selectCursor, isEqual)

  const selectStyle = useCallback((state: State) => getStyle(state, head(simplePath)), [simplePath])
  // Recalculate multiline on =style change, since styles such as font size can affect thought width.
  // Must wait one render since getStyle updates as soon as =style has loaded in the Redux store but before it has been applied to the DOM.
  useSelectorEffect(updateMultiline, selectStyle, isEqual)

  // Recalculate height after thought value changes.
  // Otherwise, the hight is not recalculated after splitThought.
  // TODO: useLayoutEffect does not work for some reason, causing the thought to briefly render at the incorrect height.
  const splitThoughtValue = useSelector(state => {
    const thoughtId = head(simplePath)
    return thoughtId ? getThoughtById(state, thoughtId)?.value : null
  })
  useEffect(updateMultiline, [splitThoughtValue, updateMultiline])

  const selectInnerWidth = useCallback((state: ViewportState) => state.innerWidth, [])
  // re-measure when the screen is resized
  viewportStore.useSelectorEffect(updateMultiline, selectInnerWidth)

  return multiline
}

export default useMultiline
