import { useCallback, useEffect, useState } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import useSelectorEffect from '../../hooks/useSelectorEffect'
import getThoughtById from '../../selectors/getThoughtById'
import editingValueStore from '../../stores/editingValue'
import head from '../../util/head'

/** Returns true if the element has more than one line of text. */
const useMultiline = (contentRef: React.RefObject<HTMLElement>, simplePath: SimplePath, isEditing?: boolean) => {
  const [multiline, setMultiline] = useState(false)
  const fontSize = useSelector((state: State) => state.fontSize)

  // re-render when live value changes
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath))?.value)
  editingValueStore.useSelector((editingValue: string | null) => (isEditing ? editingValue : value))

  const updateMultiline = useCallback(() => {
    if (!contentRef.current) return

    const height = contentRef.current.clientHeight
    // 1.72 must match line-height as defined in .thought-container
    const singleLineHeight = fontSize * 1.72
    // .editable.multiline gets 5px of padding-top to offset the collapsed line-height
    // we need to account for padding-top, otherwise it can cause a false positive
    const paddingTop = parseInt(window.getComputedStyle(contentRef.current).paddingTop)
    // The element is multiline if its height is twice the single line height.
    // (Actually we just check if it is over 1.5x the single line height for a more forgiving condition.)
    setMultiline(height - paddingTop > singleLineHeight * 1.5)
  }, [fontSize])

  // subscribe to cursosr change, but only re-render if multiline actually changes
  useSelectorEffect((state: State) => state.cursor?.length, updateMultiline, shallowEqual)
  useEffect(updateMultiline)

  return multiline
}

export default useMultiline
