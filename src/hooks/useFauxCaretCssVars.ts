import { useEffect, useState } from 'react'
import Path from '../@types/Path'
import { isMobileSafari } from '../browser'
import { isEndOfElementNode, isNote, isStartOfElementNode } from '../device/selection'
import editingValueStore from '../stores/editingValue'

/** Returns CSS variables that will suppress faux carets at the start or end of thoughts or notes.
 * */
const useFauxCaretCssVars = (
  editing: boolean | null,
  // Undo followed by redo causes the component to re-mount with the same prop values,
  // but fadeThoughRef is re-created and will trigger an update.
  fadeThoughtElement: HTMLDivElement | null,
  isCursor: boolean,
  path: Path,
) => {
  const [showLineEndFauxCaret, setShowLineEndFauxCaret] = useState(false)
  const [showLineStartFauxCaret, setShowLineStartFauxCaret] = useState(false)
  const [showNoteLineEndFauxCaret, setShowNoteLineEndFauxCaret] = useState(false)

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
          if (isNote()) {
            setShowLineStartFauxCaret(false)
            setShowLineEndFauxCaret(false)
            setShowNoteLineEndFauxCaret(isEndOfElementNode())
          } else {
            setShowLineStartFauxCaret(isStartOfElementNode())
            setShowLineEndFauxCaret(isEndOfElementNode())
            setShowNoteLineEndFauxCaret(false)
          }
        }
      })
    } else {
      setShowLineStartFauxCaret(false)
      setShowLineEndFauxCaret(false)
      setShowNoteLineEndFauxCaret(false)
    }
  }, [editing, fadeThoughtElement, isCursor, path])

  return {
    '--faux-caret-line-start-opacity': showLineStartFauxCaret ? undefined : 0,
    '--faux-caret-line-end-opacity': showLineEndFauxCaret ? undefined : 0,
    '--faux-caret-note-line-end-opacity': showNoteLineEndFauxCaret ? undefined : 0,
  }
}

export default useFauxCaretCssVars
