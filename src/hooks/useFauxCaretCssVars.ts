import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import FauxCaretType from '../@types/FauxCaretType'
import Path from '../@types/Path'
import { isSafari, isTouch } from '../browser'
import { isEndOfElementNode, isStartOfElementNode } from '../device/selection'
import editingValueStore from '../stores/editingValue'

/** Returns CSS variables that will suppress faux carets at the start or end of thoughts or notes.
 * */
const useFauxCaretNodeProvider = ({
  editing,
  fadeThoughtElement,
  isCursor,
  isTableCol1,
  path,
}: {
  editing: boolean | null
  /* Undo followed by redo causes the component to re-mount with the same prop values, but fadeThoughRef is re-created and will trigger an update. */
  fadeThoughtElement: HTMLDivElement | null
  isCursor: boolean
  isTableCol1: boolean
  path: Path
}) => {
  const [fauxCaretType, setFauxCaretType] = useState<FauxCaretType>('none')
  const noteFocus = useSelector(state => state.noteFocus)

  // Hide the faux caret when typing occurs.
  editingValueStore.useEffect(() => {
    if (isTouch && isSafari()) {
      setFauxCaretType('none')
    }
  })

  // If the thought isCursor and keyboard is open, position the faux cursor at the point where the
  // selection is created.
  useEffect(
    () => {
      let timeout = undefined
      if (!isTouch || !isSafari()) return
      if (editing && isCursor) {
        // The selection ranges aren't updated until the end of the frame when the thought is focused.
        timeout = setTimeout(() => {
          if (noteFocus) {
            setFauxCaretType(isStartOfElementNode() ? 'noteStart' : isEndOfElementNode() ? 'noteEnd' : 'none')
          } else {
            setFauxCaretType(isStartOfElementNode() ? 'thoughtStart' : isEndOfElementNode() ? 'thoughtEnd' : 'none')
          }
        })
      } else {
        setFauxCaretType('none')
      }

      return () => clearTimeout(timeout)
    },
    /* Changes to fadeThoughtElement and isTableCol1 can trigger the hideCaret animation to update, even though they are not directly used in calculating the caret type. */ [
      editing,
      fadeThoughtElement,
      isCursor,
      isTableCol1,
      noteFocus,
      path,
    ],
  )

  return {
    '--faux-caret-line-start-opacity': fauxCaretType === 'thoughtStart' ? undefined : 0,
    '--faux-caret-line-end-opacity': fauxCaretType === 'thoughtEnd' ? undefined : 0,
    '--faux-caret-note-line-start-opacity': fauxCaretType === 'noteStart' ? undefined : 0,
    '--faux-caret-note-line-end-opacity': fauxCaretType === 'noteEnd' ? undefined : 0,
  }
}

export default useFauxCaretNodeProvider
