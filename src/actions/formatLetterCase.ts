/* eslint-disable import/prefer-default-export */
import LetterCaseType from '../@types/LetterCaseType'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import documentSort from '../selectors/documentSort'
import pathToThought from '../selectors/pathToThought'
import simplifyPath from '../selectors/simplifyPath'
import applyLetterCase from '../util/applyLetterCase'
import hashPath from '../util/hashPath'
import { editThoughtActionCreator as editThought } from './editThought'
import { setCursorActionCreator as setCursor } from './setCursor'

/** Format the browser selection or cursor thought based on the specified letter case change. */
export const formatLetterCaseActionCreator =
  (command: LetterCaseType): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const cursor = state.cursor
    if (!cursor) return

    const multicursorPaths = documentSort(state, Object.values(state.multicursors))
    const cursorHash = hashPath(cursor)
    const multicursorHasCursor = multicursorPaths.some(path => hashPath(path) === cursorHash)
    const shouldAppendCursor = multicursorPaths.length === 0 || !multicursorHasCursor
    const paths = shouldAppendCursor ? [...multicursorPaths, cursor] : multicursorPaths
    const offset = selection.offsetThought()
    const cursorSimplePath = simplifyPath(state, cursor)

    paths.forEach(path => {
      const thought = pathToThought(state, path)
      if (!thought) return

      dispatch(
        editThought({
          oldValue: thought.value,
          newValue: applyLetterCase(command, thought.value),
          path: simplifyPath(state, path),
          force: true,
        }),
      )
    })

    dispatch(setCursor({ path: cursorSimplePath, offset }))
  }
