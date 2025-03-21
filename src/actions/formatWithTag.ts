/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { ColorToken } from '../colors.config'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'
import themeColors from '../selectors/themeColors'
import thoughtToPath from '../selectors/thoughtToPath'
import suppressFocusStore from '../stores/suppressFocus'
import getCommandState from '../util/getCommandState'
import strip from '../util/strip'
import { editThoughtActionCreator as editThought } from './editThought'

/** Returns the corresponding inline CSS style string for a given formatting command. */
const getInlineStyle = (
  command: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'foreColor' | 'backColor',
  color: ColorToken | undefined,
  colors: Record<string, string>,
): string => {
  switch (command) {
    case 'bold':
      return 'font-weight: bold;'
    case 'italic':
      return 'font-style: italic;'
    case 'underline':
      return 'text-decoration: underline;'
    case 'strikethrough':
      return 'text-decoration: line-through;'
    case 'code':
      return 'font-family: monospace;'
    case 'foreColor':
      return `color: ${color ? colors[color] : ''};`
    case 'backColor':
      return `background-color: ${color ? colors[color] : ''};`
    default:
      return ''
  }
}

/** Format the browser selection or cursor thought with the provided command,
 * using a span with inline styles.
 */
export const formatWithTagActionCreator =
  (
    command: 'bold' | 'italic' | 'strikethrough' | 'underline' | 'code' | 'foreColor' | 'backColor',
    color?: ColorToken,
  ): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    if (!state.cursor) return
    const thought = pathToThought(state, state.cursor)
    if (!thought) return
    const simplePath = thoughtToPath(state, thought.id)
    const colors = themeColors(state)
    suppressFocusStore.update(true)

    // We'll use a regex to remove any existing inline formatting from a span.
    // Here, we look for a span with a style attribute.
    // (This is a simple approach – we might refine the regex if needed.)
    const spanRegExp = /<span\s+style="([^"]*)">([\s\S]*?)<\/span>/i

    // Determine if the entire thought is selected.
    const thoughtSelected =
      (selection.text()?.length === 0 && strip(thought.value).length !== 0) ||
      selection.text()?.length === strip(thought.value).length

    if (thoughtSelected) {
      // Format the entire thought.
      const isAllFormatted = getCommandState(thought.value)[command]
      // Remove any span wrapping (i.e. unwrap formatting)
      const withoutSpan = thought.value.replace(spanRegExp, '$2')
      const newValue = isAllFormatted
        ? withoutSpan
        : `<span style="${getInlineStyle(command, color, colors)}">${withoutSpan}</span>`
      dispatch(
        editThought({
          cursorOffset: selection.offsetThought() ?? undefined,
          oldValue: thought.value,
          newValue,
          path: simplePath,
          force: true,
        }),
      )
    } else {
      // Format only the selected part.
      const selectedText = selection.html()
      if (!selectedText) return
      const isAllFormatted = getCommandState(selectedText)[command]
      const withoutSpan = selectedText.replace(spanRegExp, '$2')
      const newPart = isAllFormatted
        ? withoutSpan
        : `<span style="${getInlineStyle(command, color, colors)}">${withoutSpan}</span>`
      const newValue = thought.value.replace(selectedText, newPart)
      dispatch(
        editThought({
          cursorOffset: selection.offsetThought() ?? undefined,
          oldValue: selectedText,
          newValue,
          path: simplePath,
          force: true,
        }),
      )
    }
    suppressFocusStore.update(false)
  }
