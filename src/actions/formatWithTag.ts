/* eslint-disable import/prefer-default-export */
import FormattingCommand from '../@types/FormattingCommand'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'
import thoughtToPath from '../selectors/thoughtToPath'
import suppressFocusStore from '../stores/suppressFocus'
import getCommandState from '../util/getCommandState'
import strip from '../util/strip'
import { editThoughtActionCreator as editThought } from './editThought'

/** Format the browser selection or cursor thought with the provided tag. */
export const formatWithTagActionCreator =
  (tag: FormattingCommand): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    if (!state.cursor) return
    const thought = pathToThought(state, state.cursor)
    const simplePath = thoughtToPath(state, thought.id)
    suppressFocusStore.update(true)

    const tagRegExp = new RegExp(`<${tag}[^>]*>|<\/${tag}>`, 'g')

    const thoughtSelected =
      (selection.text()?.length === 0 && strip(thought.value).length !== 0) ||
      selection.text()?.length === strip(thought.value).length

    if (thoughtSelected) {
      // format the entire thought
      const isAllFormatted = getCommandState(thought.value)[tag]
      const withoutTag = thought.value.replace(tagRegExp, '')
      const newValue = isAllFormatted
        ? withoutTag // remove tag
        : `<${tag}>${withoutTag}</${tag}>` // add tag
      dispatch(
        editThought({
          cursorOffset: selection.offsetThought() ?? undefined,
          oldValue: thought.value,
          newValue: newValue,
          path: simplePath,
          force: true,
        }),
      )
    } else {
      // format the selection
      const selectedText = selection.html()
      if (!selectedText) return
      const isAllFormatted = getCommandState(selectedText)[tag]
      const withoutTag = selectedText.replace(tagRegExp, '')
      const newPart = isAllFormatted
        ? withoutTag // remove tag
        : `<${tag}>${withoutTag}</${tag}>` // add tag
      const newValue = thought.value.replace(selectedText, newPart)
      dispatch(
        editThought({
          cursorOffset: selection.offsetThought() ?? undefined,
          oldValue: selectedText,
          newValue: newValue,
          path: simplePath,
          force: true,
        }),
      )
    }
    suppressFocusStore.update(false)
  }
