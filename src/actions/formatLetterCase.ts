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
    const multicursorPathSet = new Set(multicursorPaths.map(hashPath))
    const paths =
      multicursorPaths.length === 0
        ? [cursor]
        : multicursorPathSet.has(hashPath(cursor))
          ? multicursorPaths
          : [...multicursorPaths, cursor]
    const offset = selection.offsetThought()
    const cursorSimplePath = simplifyPath(state, cursor)

    paths
      .map(path => {
        const thought = pathToThought(state, path)
        if (!thought) return null
        return {
          oldValue: thought.value,
          newValue: applyLetterCase(command, thought.value),
          path: simplifyPath(state, path),
        }
      })
      .filter(
        (
          edit,
        ): edit is {
          oldValue: string
          newValue: string
          path: ReturnType<typeof simplifyPath>
        } => !!edit,
      )
      .forEach(edit =>
        dispatch(
          editThought({
            oldValue: edit.oldValue,
            newValue: edit.newValue,
            path: edit.path,
            force: true,
          }),
        ),
      )

    dispatch(setCursor({ path: cursorSimplePath, offset }))
  }
