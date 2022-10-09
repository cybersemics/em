import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import getThoughtById from '../../selectors/getThoughtById'
import head from '../../util/head'

/** Returns true if the element has more than one line of text. */
const useMultiline = (contentRef: React.RefObject<HTMLElement>, simplePath: SimplePath, isEditing?: boolean) => {
  const [multiline, setMultiline] = useState(false)
  const fontSize = useSelector((state: State) => state.fontSize)

  // re-render when live value changes
  useSelector((state: State) => (isEditing ? state.editingValue : getThoughtById(state, head(simplePath))))

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.clientHeight
      // 1.72 must match line-height as defined in .thought-container
      const singleLineHeight = fontSize * 1.72
      // .editable.multiline gets 5px of padding-top to offset the collapsed line-height
      // we need to account for padding-top, otherwise it can cause a false positive
      const paddingTop = parseInt(window.getComputedStyle(contentRef.current).paddingTop)
      // The element is multiline if its height is twice the single line height.
      // (Actually we just check if it is over 1.5x the single line height for a more forgiving condition.)
      setMultiline(height - paddingTop > singleLineHeight * 1.5)
    }
  })

  return multiline
}

export default useMultiline
