/* eslint-disable import/prefer-default-export */
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'
import getLatestActionLabel from '../util/getLatestActionLabel'
import trimHtml from '../util/trimHtml'
import { alertActionCreator as alert } from './alert'

/** Matches the whitespace that trimHtml removes from either end of a value, which excludes the no-break space. */
const REGEX_LEADING_WHITESPACE = /^[ \t\r\n]+/
const REGEX_BOUNDARY_WHITESPACE = /^[ \t\r\n]+|[ \t\r\n]+$/g

/** Returns where to place the caret if the cursor thought's editable shows whitespace at either end that was never saved, or null if it shows its saved value. A thought's value is saved trimmed, so whitespace typed at either end of it is no undo step of its own (#6347). */
const unsavedWhitespaceCaret = (state: State): number | null => {
  if (!state.cursor || state.noteFocus) return null
  const thought = pathToThought(state, state.cursor)
  const editable = thought ? document.querySelector(`[aria-label="editable-${thought.id}"]`) : null
  if (!thought || !editable) return null

  const html = editable.innerHTML
  if (html === thought.value || trimHtml(html) !== thought.value) return null

  // The caret counted in the saved text: less the leading whitespace that is discarded, and no further than its end.
  const text = editable.textContent ?? ''
  const leadingWhitespace = text.match(REGEX_LEADING_WHITESPACE)?.[0].length ?? 0
  const offset = (selection.isOnEditable(thought.id) ? selection.offsetThought() : null) ?? text.length
  return Math.min(Math.max(0, offset - leadingWhitespace), text.replace(REGEX_BOUNDARY_WHITESPACE, '').length)
}

/** Action-creator for undo.
 *
 * Whitespace typed at either end of the cursor thought is discarded first, without reverting the history, since it was never saved and so has no undo step of its own. Otherwise Undo would revert the step before it, and the forced render would remove the whitespace along with it (#6347).
 *
 * @param cursorAtEnd  Place the caret at the end of the restored thought instead of restoring the cursor offset captured before the undone action. Used by native undo (iOS three-finger swipe / shake-to-undo), which is expected to leave the caret at the end of the restored word.
 * @param count  The exact number of patches to revert instead of one step. Used by the undo slider to move through the history by whole steps (see selectors/undoSteps).
 */
export const undoActionCreator =
  ({ cursorAtEnd, count }: { cursorAtEnd?: boolean; count?: number } = {}): Thunk =>
  (dispatch, getState) => {
    // The undo slider moves through the saved history by whole steps, so it does not discard unsaved whitespace.
    if (count == null) {
      const caret = unsavedWhitespaceCaret(getState())
      if (caret !== null) {
        dispatch({ type: 'editableRender', cursorOffset: caret })
        return
      }
    }

    const lastActionLabel = getLatestActionLabel(getState().undoPatches)

    dispatch({ type: 'undo', cursorAtEnd, count })

    if (!lastActionLabel) return

    dispatch(
      alert(`Undo: ${lastActionLabel}`, {
        alertType: AlertType.Undo,
      }),
    )
  }
