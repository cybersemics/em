/* eslint-disable import/prefer-default-export */
import { titleCase } from 'title-case'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'
import simplifyPath from '../selectors/simplifyPath'
import { editThoughtActionCreator as editThought } from './editThought'

/** Format the browser selection or cursor thought based on the specified letter case change. */
export const formatLetterCaseActionCreator =
  (command: string): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const cursor = state.cursor

    if (!cursor) return

    const thought = pathToThought(state, cursor)
    const originalThoughtValue = thought.value
    const savedSelection = selection.save()
    /** Util function to apply the appropriate transformation based on the command. */
    const getUpdatedThoughtValue = (command: string, value: string): string => {
      switch (command) {
        case 'LowerCase':
          return value.toLowerCase()
        case 'UpperCase':
          return value.toUpperCase()
        case 'SentenceCase': {
          const sentenceCaseRegex = /(^\w|\.\s*\w)/gi
          return value.toLowerCase().replace(sentenceCaseRegex, match => match.toUpperCase())
        }
        case 'TitleCase':
          return titleCase(value.toLowerCase())
        default:
          return value
      }
    }

    const updatedThoughtValue = getUpdatedThoughtValue(command, originalThoughtValue)
    const simplePath = simplifyPath(state, cursor)

    dispatch(
      editThought({
        oldValue: originalThoughtValue,
        newValue: updatedThoughtValue,
        path: simplePath,
      }),
    )
    selection.restore(savedSelection)
  }
