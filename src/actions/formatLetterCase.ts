/* eslint-disable import/prefer-default-export */
import LetterCaseType from '../@types/LetterCaseType'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'
import simplifyPath from '../selectors/simplifyPath'
import applyLetterCase from '../util/applyLetterCase'
import { editThoughtActionCreator as editThought } from './editThought'

/** Format the browser selection or cursor thought based on the specified letter case change. */
export const formatLetterCaseActionCreator =
  (command: LetterCaseType): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const cursor = state.cursor
    if (!cursor) return

    const thought = pathToThought(state, cursor)
    const originalThoughtValue = thought.value

    const updatedThoughtValue = applyLetterCase(command, originalThoughtValue)
    const simplePath = simplifyPath(state, cursor)

    const savedSelection = selection.save()

    dispatch(
      editThought({
        oldValue: originalThoughtValue,
        newValue: updatedThoughtValue,
        path: simplePath,
        force: true,
      }),
    )
    if (!savedSelection) return
    savedSelection.node.textContent = updatedThoughtValue
    selection.restore(savedSelection)
  }
