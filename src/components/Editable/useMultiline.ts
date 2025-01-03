import { head } from 'lodash'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import useSelectorEffect from '../../hooks/useSelectorEffect'
import getThoughtById from '../../selectors/getThoughtById'
import editingValueStore from '../../stores/editingValue'
import viewportStore from '../../stores/viewport'

/** Selects the cursor from the state. */
const selectCursor = (state: State) => state.cursor

/** Returns true if the element has more than one line of text. */
const useMultiline = (contentRef: React.RefObject<HTMLElement>, simplePath: SimplePath, isEditing?: boolean) => {
  const [multiline, setMultiline] = useState(false)
  const fontSize = useSelector(state => state.fontSize)
  const showSplitView = useSelector(state => state.showSplitView)
  const splitPosition = useSelector(state => state.splitPosition)

  // While editing, watch the current Value and trigger the layout effect
  const editingValue = editingValueStore.useSelector(state => (isEditing ? state : null))

  const updateMultiline = useCallback(() => {
    if (!contentRef.current) return

    const height = contentRef.current.getBoundingClientRect().height
    // must match line-height as defined in thought-container
    const singleLineHeight = fontSize * 2
    // .editable.multiline gets 5px of padding-top to offset the collapsed line-height
    // we need to account for padding-top, otherwise it can cause a false positive
    const paddingTop = parseInt(window.getComputedStyle(contentRef.current).paddingTop)
    // The element is multiline if its height is twice the single line height.
    // (Actually we just check if it is over 1.5x the single line height for a more forgiving condition.)
    setMultiline(height - paddingTop > singleLineHeight * 1.5)
  }, [contentRef, fontSize])

  // Recalculate multiline on mount, when the font size changes, edit, split view resize, value changes, and when the
  // cursor changes to or from the element.
  useLayoutEffect(updateMultiline, [
    contentRef,
    fontSize,
    isEditing,
    showSplitView,
    simplePath,
    splitPosition,
    editingValue,
    updateMultiline,
  ])

  // Recalculate multiline when the cursor changes.
  // This is necessary because the width of thoughts change as the autofocus indent changes.
  // (do not re-render component unless multiline changes)
  useSelectorEffect(updateMultiline, selectCursor, shallowEqual)

  // Recalculate height after thought value changes.
  // Otherwise, the hight is not recalculated after splitThought.
  // TODO: useLayoutEffect does not work for some reason, causing the thought to briefly render at the incorrect height.
  const splitThoughtValue = useSelector(state => {
    const thoughtId = head(simplePath)
    return thoughtId ? getThoughtById(state, thoughtId)?.value : null
  })
  useEffect(updateMultiline, [splitThoughtValue, updateMultiline])

  // re-measure when the screen is resized
  viewportStore.useSelectorEffect(updateMultiline, state => state.innerWidth)

  return multiline
}

export default useMultiline
