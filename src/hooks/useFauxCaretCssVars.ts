import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import Path from '../@types/Path'
import { isMobileSafari } from '../browser'
import { isEndOfElementNode, isStartOfElementNode } from '../device/selection'
import editingValueStore from '../stores/editingValue'

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
  const [showLineEndFauxCaret, setShowLineEndFauxCaret] = useState(false)
  const [showLineStartFauxCaret, setShowLineStartFauxCaret] = useState(false)
  const [showNoteLineStartFauxCaret, setShowNoteLineStartFauxCaret] = useState(false)
  const [showNoteLineEndFauxCaret, setShowNoteLineEndFauxCaret] = useState(false)
  const noteFocus = useSelector(state => state.noteFocus)

  // Hide the faux caret when typing occurs.
  editingValueStore.useEffect(() => {
    if (!isMobileSafari()) return
    setShowLineStartFauxCaret(false)
    setShowLineEndFauxCaret(false)
    setShowNoteLineEndFauxCaret(false)
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
            setShowLineStartFauxCaret(false)
            setShowLineEndFauxCaret(false)
            setShowNoteLineStartFauxCaret(isStartOfElementNode())
            setShowNoteLineEndFauxCaret(isEndOfElementNode())
          } else {
            setShowLineStartFauxCaret(isStartOfElementNode())
            setShowLineEndFauxCaret(isEndOfElementNode())
            setShowNoteLineStartFauxCaret(false)
            setShowNoteLineEndFauxCaret(false)
          }
        }
      })
    } else {
      setShowLineStartFauxCaret(false)
      setShowLineEndFauxCaret(false)
      setShowNoteLineStartFauxCaret(false)
      setShowNoteLineEndFauxCaret(false)
    }
  }, [editing, fadeThoughtElement, isCursor, isTableCol1, path])

  return {
    '--faux-caret-line-start-opacity': showLineStartFauxCaret ? undefined : 0,
    '--faux-caret-line-end-opacity': showLineEndFauxCaret ? undefined : 0,
    '--faux-caret-note-line-end-opacity': showNoteLineEndFauxCaret ? undefined : 0,
    '--faux-caret-note-line-start-opacity': showNoteLineStartFauxCaret ? undefined : 0,
  }
}

export default useFauxCaretCssVars
