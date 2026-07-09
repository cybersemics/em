/* eslint-disable import/prefer-default-export */
import FormattingCommand from '../@types/FormattingCommand'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'
import thoughtToPath from '../selectors/thoughtToPath'
import commandStateStore from '../stores/commandStateStore'
import suppressFocusStore from '../stores/suppressFocus'
import getCommandState from '../util/getCommandState'
import strip from '../util/strip'
import { editThoughtActionCreator as editThought } from './editThought'

/** Maps a FormattingCommand to the HTML tag used to wrap the formatted value. The FormattingCommand value matches the tag name only for `code`, so the others must be mapped explicitly (e.g. bold → b). */
const formattingCommandTag: Record<FormattingCommand, string> = {
  [FormattingCommand.bold]: 'b',
  [FormattingCommand.italic]: 'i',
  [FormattingCommand.underline]: 'u',
  [FormattingCommand.strikethrough]: 'strike',
  [FormattingCommand.code]: 'code',
  [FormattingCommand.foreColor]: 'span',
  [FormattingCommand.backColor]: 'span',
}

/** Format the browser selection or cursor thought with the provided tag. */
export const formatWithTagActionCreator =
  (command: FormattingCommand): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    if (!state.cursor) return
    const thought = pathToThought(state, state.cursor)
    if (!thought) return
    const simplePath = thoughtToPath(state, thought.id)
    suppressFocusStore.update(true)

    const tag = formattingCommandTag[command]
    const tagRegExp = new RegExp(`<${tag}[^>]*>|<\/${tag}>`, 'g')

    const thoughtSelected =
      (selection.text()?.length === 0 && strip(thought.value).length !== 0) ||
      selection.text()?.length === strip(thought.value).length

    // The command state that the toolbar button reads to render its active highlight. It is derived directly from the
    // formatted result (not the DOM selection) because formatWithTag edits the thought value via editThought, which
    // re-renders asynchronously; reading window.getSelection() here would return the stale, pre-format DOM.
    let commandStateSource: string

    if (thoughtSelected) {
      // format the entire thought
      const isAllFormatted = getCommandState(thought.value)[command]
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
      commandStateSource = newValue
    } else {
      // format the selection
      const selectedText = selection.html()
      if (!selectedText) return
      const isAllFormatted = getCommandState(selectedText)[command]
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
      // Reflect the state of the formatted selection (newPart), not the whole thought.
      commandStateSource = newPart
    }

    // Refresh the command state store so the toolbar button reflects the new formatting. Unlike formatSelection (which
    // uses document.execCommand and relies on the resulting selectionchange event), formatWithTag edits the thought
    // value directly, so no selectionchange fires and the button highlight would otherwise go stale.
    commandStateStore.update(getCommandState(commandStateSource))

    suppressFocusStore.update(false)
  }
