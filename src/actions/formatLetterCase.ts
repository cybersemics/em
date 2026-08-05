/* eslint-disable import/prefer-default-export */
import LetterCaseType from '../@types/LetterCaseType'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import noteValue from '../selectors/noteValue'
import resolveNotePath from '../selectors/resolveNotePath'
import simplifyPath from '../selectors/simplifyPath'
import applyLetterCase from '../util/applyLetterCase'
import head from '../util/head'
import { editThoughtActionCreator as editThought } from './editThought'
import { setCursorActionCreator as setCursor } from './setCursor'
import { setDescendantActionCreator as setDescendant } from './setDescendant'

/** Format the browser selection or cursor thought based on the specified letter case change. */
export const formatLetterCaseActionCreator =
  (command: LetterCaseType): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const cursor = state.cursor
    if (!cursor) return

    // when the caret is on a note, format the note instead of the thought (#4469)
    // resolveNotePath returns null if the thought has no note, in which case there is nothing to format
    const targetPath = state.noteFocus ? resolveNotePath(state, cursor) : cursor
    const paths = hasMulticursor(state) ? Object.values(state.multicursors) : targetPath ? [targetPath] : []
    const offset = selection.offsetThought()
    const cursorSimplePath = simplifyPath(state, cursor)

    // The plain-text offsets of the selected text within the cursor thought, so that it can be re-selected after the
    // edit (#4840). Letter case transforms preserve text length (see applyLetterCase), so the offsets remain valid.
    const cursorEditableSelector = `[aria-label="editable-${head(cursor)}"]`
    const cursorEditable = state.noteFocus
      ? null
      : (document.querySelector(cursorEditableSelector) as HTMLElement | null)
    const selectedRange = cursorEditable ? selection.offsetRange(cursorEditable) : null
    const editActions = paths.flatMap(path => {
      const value = state.noteFocus ? noteValue(state, cursor) : getThoughtById(state, head(path))?.value

      if (!value) return []

      const newValue = applyLetterCase(command, value)

      return state.noteFocus
        ? [
            setDescendant({
              path,
              values: [newValue],
            }),
          ]
        : [
            editThought({
              oldValue: value,
              newValue,
              path: simplifyPath(state, path),
              force: true,
            }),
          ]
    })

    dispatch(editActions)

    // noteFocus doesn't respect cursorOffset, so better to avoid setting the cursor when the caret is on a note (#4469)
    // It shouldn't be possible to have noteFocus be true with the keyboard closed, so setCursor shouldn't be necessary for notes.
    // It seems like the caret goes to the end of the note anyway when its value is replaced.
    // preserveMulticursor keeps the multiselected thoughts selected, otherwise setCursor clears them (#4840).
    if (!state.noteFocus) dispatch(setCursor({ path: cursorSimplePath, offset, preserveMulticursor: true }))

    // Re-select the text that was selected before the edit (#4840). editThought re-renders the ContentEditable from
    // the new value, which destroys the browser selection, and useEditMode then collapses the caret to cursorOffset.
    // Defer to the next frame so the re-selection occurs after the re-render, before the browser paints.
    if (selectedRange && selectedRange.end > selectedRange.start) {
      requestAnimationFrame(() => {
        const editable = document.querySelector(cursorEditableSelector) as HTMLElement | null
        selection.setRange(editable, selectedRange)
      })
    }
  }
