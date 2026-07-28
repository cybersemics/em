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
    const editActions = paths.flatMap(path => {
      const value = state.noteFocus ? noteValue(state, cursor) : getThoughtById(state, head(cursor))?.value

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
    if (!state.noteFocus) dispatch(setCursor({ path: cursorSimplePath, offset }))
  }
