import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import Path from '../@types/Path'
import { isMobileSafari } from '../browser'
import { isEndOfElementNode, isStartOfElementNode } from '../device/selection'
import editingValueStore from '../stores/editingValue'

type FauxCaretType = 'none' | 'thoughtStart' | 'thoughtEnd' | 'noteStart' | 'noteEnd'

/** Returns CSS variables that will suppress faux carets at the start or end of thoughts or notes.
 * */
const useFauxCaretCssVars = (
  editing: boolean | null,
  // Undo followed by redo causes the component to re-mount with the same prop values,
  // but fadeThoughRef is re-created and will trigger an update.
  fadeThoughtElement: HTMLDivElement | null,
  isCursor: boolean,
  isTableCol1: boolean,
  path: Path,
) => {
  const [fauxCaretType, setFauxCaretType] = useState<FauxCaretType>('none')
  const noteFocus = useSelector(state => state.noteFocus)

  // Hide the faux caret when typing occurs.
  editingValueStore.useEffect(() => {
    if (isMobileSafari()) setFauxCaretType('none')
  })

  // If the thought isCursor and edit mode is on, position the faux cursor at the point where the
  // selection is created.
  useEffect(() => {
    if (!isMobileSafari()) return
    if (editing && isCursor) {
      // The selection ranges aren't updated until the end of the frame when the thought is focused.
      setTimeout(() => {
        if (editing && isCursor) {
          if (noteFocus) {
            setFauxCaretType(isStartOfElementNode() ? 'noteStart' : isEndOfElementNode() ? 'noteEnd' : 'none')
          } else {
            setFauxCaretType(isStartOfElementNode() ? 'thoughtStart' : isEndOfElementNode() ? 'thoughtEnd' : 'none')
          }
        }
      })
    } else {
      setFauxCaretType('none')
    }
  }, [editing, fadeThoughtElement, isCursor, isTableCol1, noteFocus, path])

  return {
    '--faux-caret-line-start-opacity': fauxCaretType === 'thoughtStart' ? undefined : 0,
    '--faux-caret-line-end-opacity': fauxCaretType === 'thoughtEnd' ? undefined : 0,
    '--faux-caret-note-line-start-opacity': fauxCaretType === 'noteStart' ? undefined : 0,
    '--faux-caret-note-line-end-opacity': fauxCaretType === 'noteEnd' ? undefined : 0,
  }
}

export default useFauxCaretCssVars
