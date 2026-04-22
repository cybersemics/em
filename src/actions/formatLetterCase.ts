/* eslint-disable import/prefer-default-export */
import LetterCaseType from '../@types/LetterCaseType'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import hasMulticursor from '../selectors/hasMulticursor'
import pathToThought from '../selectors/pathToThought'
import simplifyPath from '../selectors/simplifyPath'
import applyLetterCase from '../util/applyLetterCase'
import { editThoughtActionCreator as editThought } from './editThought'
import { setCursorActionCreator as setCursor } from './setCursor'

/** Format the browser selection or cursor thought based on the specified letter case change. */
export const formatLetterCaseActionCreator =
  (command: LetterCaseType): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const cursor = state.cursor
    if (!cursor) return

    const paths = hasMulticursor(state) ? Object.values(state.multicursors) : [cursor]
    const offset = selection.offsetThought()
    const cursorSimplePath = simplifyPath(state, cursor)
    const editActions = paths.flatMap(path => {
      const thought = pathToThought(state, path)
      return thought
        ? [
            editThought({
              oldValue: thought.value,
              newValue: applyLetterCase(command, thought.value),
              path: simplifyPath(state, path),
              force: true,
            }),
          ]
        : []
    })

    dispatch(editActions)

    dispatch(setCursor({ path: cursorSimplePath, offset }))
  }
