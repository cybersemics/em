import { useEffect, useState } from 'react'
import Path from '../@types/Path'
import { isMobileSafari } from '../browser'
import { isEndOfElementNode, isStartOfElementNode } from '../device/selection'
import editingValueStore from '../stores/editingValue'

/** Returns CSS variables that will suppress faux carets at the start or end of thoughts or notes
 * */
const useFauxCaretCssVars = (editing: boolean | null, isCursor: boolean, path: Path) => {
  const [showLineEndFauxCaret, setShowLineEndFauxCaret] = useState(false)
  const [showLineStartFauxCaret, setShowLineStartFauxCaret] = useState(false)

  // Hide the faux caret when typing occurs.
  editingValueStore.useEffect(() => {
    if (!isMobileSafari()) return
    setShowLineStartFauxCaret(false)
    setShowLineEndFauxCaret(false)
  })

  // If the thought isCursor and edit mode is on, position the faux cursor at the point where the
  // selection is created.
  useEffect(() => {
    if (!isMobileSafari()) return
    if (editing && isCursor) {
      // The selection ranges aren't updated until the end of the frame when the thought is focused.
      setTimeout(() => {
        if (editing && isCursor) {
          setShowLineStartFauxCaret(isStartOfElementNode())
          setShowLineEndFauxCaret(isEndOfElementNode())
        }
      })
    } else {
      setShowLineStartFauxCaret(false)
      setShowLineEndFauxCaret(false)
    }
  }, [editing, isCursor, path])

  return {
    '--faux-caret-line-start-opacity': showLineStartFauxCaret ? undefined : 0,
    '--faux-caret-line-end-opacity': showLineEndFauxCaret ? undefined : 0,
  }
}

export default useFauxCaretCssVars
