/* eslint-disable import/prefer-default-export */
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import * as selection from '../device/selection'
import noteValue from '../selectors/noteValue'
import pathToThought from '../selectors/pathToThought'
import editableSyncStore from '../stores/editableSyncStore'
import getLatestActionLabel from '../util/getLatestActionLabel'
import trimHtml from '../util/trimHtml'
import { alertActionCreator as alert } from './alert'

/**
 * Matches the whitespace that trimHtml removes from either end of a value, in the text rather than the HTML: everything
 * that \s matches, including Unicode spaces such as the ideographic space, except the no-break space. That one is
 * kept by trimHtml because the HTML holds it as &nbsp;, which \s does not match, while textContent holds it as U+00A0.
 */
const REGEX_LEADING_WHITESPACE = /^[^\S\u00a0]+/
const REGEX_BOUNDARY_WHITESPACE = /^[^\S\u00a0]+|[^\S\u00a0]+$/g

/** Returns where to place the caret if the cursor's editable, or its note's while the caret is on the note, shows whitespace at either end that was never saved, or null if it shows its saved value. A thought's value and a note's are saved trimmed, so whitespace typed at either end of either is no undo step of its own (#6347). */
const unsavedWhitespaceCaret = (state: State): { cursorOffset: number } | { noteOffset: number } | null => {
  if (!state.cursor) return null
  const thought = pathToThought(state, state.cursor)
  // Only the last thing done is discarded: an input that changed nothing saved, with no undoable action since. Moving
  // to another editable is undoable navigation, so the input was in the cursor's editable. Whitespace left by an input
  // that did change the saved value, such as the space before "y" in " yx" or after deleting the first word, goes with
  // that input's own undo step.
  if (!thought || editableSyncStore.getState().unsavedInputUndoPatches !== state.undoPatches) return null
  const editable = document.querySelector(
    state.noteFocus
      ? `[aria-label="note-editable"][data-thought-id="${thought.id}"]`
      : `[aria-label="editable-${thought.id}"]`,
  )
  const saved = state.noteFocus ? noteValue(state, state.cursor) : thought.value
  if (!editable || saved === null) return null

  const html = editable.innerHTML
  if (html === saved || trimHtml(html) !== saved) return null

  // The caret counted in the saved text: less the leading whitespace that is discarded, and no further than its end.
  const text = editable.textContent ?? ''
  const leadingWhitespace = text.match(REGEX_LEADING_WHITESPACE)?.[0].length ?? 0
  const offset = selection.offsetFromNode(editable) ?? text.length
  const caret = Math.min(Math.max(0, offset - leadingWhitespace), text.replace(REGEX_BOUNDARY_WHITESPACE, '').length)
  return state.noteFocus ? { noteOffset: caret } : { cursorOffset: caret }
}

/** Action-creator for undo.
 *
 * Whitespace typed at either end of the cursor thought, or of its note while the caret is on the note, is discarded first, without reverting the history, since it was never saved and so has no undo step of its own. Otherwise Undo would revert the step before it, and the forced render would remove the whitespace along with it (#6347).
 *
 * @param cursorAtEnd  Place the caret at the end of the restored thought instead of restoring the cursor offset captured before the undone action. Used by native undo (iOS three-finger swipe / shake-to-undo), which is expected to leave the caret at the end of the restored word.
 * @param count  The exact number of patches to revert instead of one step. Used by the undo slider to move through the history by whole steps (see selectors/undoSteps).
 */
export const undoActionCreator =
  ({ cursorAtEnd, count }: { cursorAtEnd?: boolean; count?: number } = {}): Thunk =>
  (dispatch, getState) => {
    // The undo slider passes count to reach a position in the saved history, so it must revert exactly that many patches.
    // Discarding unsaved whitespace instead would revert nothing and leave the history behind the slider's handle.
    if (count == null) {
      const caret = unsavedWhitespaceCaret(getState())
      if (caret) {
        editableSyncStore.update({ unsavedInputUndoPatches: null })
        dispatch({ type: 'editableRender', ...caret })
        // Named as the edit would be had it changed the saved value, so that Undo reads the same for any typing.
        dispatch(alert(`Undo: ${'noteOffset' in caret ? 'Edit Note' : 'Edit Thought'}`, { alertType: AlertType.Undo }))
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
