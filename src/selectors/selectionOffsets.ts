import State from '../@types/State'
import * as selection from '../device/selection'
import head from '../util/head'

/** Returns the plain-text character offsets of the selected text within the cursor thought's value, or null if there
 * is no cursor to read them on. A collapsed caret, or a selection that has left the cursor thought, yields equal
 * offsets rather than null, so that a command invoked with nothing selected can say so.
 *
 * The offsets normally come from the live browser selection. They come instead from the snapshot in
 * state.selectionOffsets when the live selection has left the cursor thought and a snapshot was taken on it — which is
 * the state the Command Universe leaves behind, since its search input takes the focus when it opens and the document
 * has only one selection. Without the fallback, a command executed from the Command Universe reads the collapsed caret
 * sitting in the search box rather than the text the user selected, and reports "No text selected to extract".
 *
 * The snapshot is only honored for the thought it was taken on. A command executed from the Command Universe can move
 * the cursor, which would otherwise leave the next command slicing a different thought at offsets that index into the
 * one the snapshot came from.
 */
const selectionOffsets = (state: State): { start: number; end: number } | null => {
  const thoughtId = state.cursor && head(state.cursor)
  if (!thoughtId) return null

  if (!selection.isOnEditable(thoughtId) && state.selectionOffsets?.thoughtId === thoughtId) {
    return state.selectionOffsets
  }

  const editable = document.querySelector(`[aria-label="editable-${thoughtId}"]`)
  const offsets = editable ? selection.offsetRange(editable as HTMLElement) : null

  // A selection outside the cursor thought selects none of its text, which the caller reports as such.
  return offsets ?? { start: 0, end: 0 }
}

export default selectionOffsets
