/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { ColorToken } from '../colors.config'
import { commandEmitter } from '../commands'
import * as selection from '../device/selection'
import noteValue from '../selectors/noteValue'
import pathToThought from '../selectors/pathToThought'
import resolveNotePath from '../selectors/resolveNotePath'
import simplifyPath from '../selectors/simplifyPath'
import themeColors from '../selectors/themeColors'
import { updateCommandState } from '../stores/commandStateStore'
import formatSelectionHtml, { FormatCommand } from '../util/formatSelectionHtml'
import { editThoughtActionCreator as editThought } from './editThought'
import { setDescendantActionCreator as setDescendant } from './setDescendant'

/** Format the browser selection or cursor thought as bold, italic, strikethrough, underline, code, color, or removeFormat.
 * Computes the new HTML synchronously with the DOM (no document.execCommand) and dispatches a single editThought/setDescendant (#4637). */
export const formatSelectionActionCreator =
  (command: FormatCommand, color?: ColorToken): Thunk =>
  (dispatch, getState) => {
    // Flush any pending throttled edit from the Editable so formatSelection reads the latest committed value.
    // A toolbar picker (e.g. ColorPicker) dispatches formatSelection directly, bypassing executeCommand's
    // commandEmitter flush; without this, a still-in-flight typed edit (EDIT_THROTTLE trailing edge) commits AFTER the
    // formatting edit and clobbers it, dropping the applied color/formatting (#4657). The keyboard and gesture command
    // paths already flush via commandEmitter.trigger('command').
    commandEmitter.trigger('command')

    const state = getState()
    if (!state.cursor) return
    const thought = pathToThought(state, state.cursor)
    if (!thought) return
    const colors = themeColors(state)

    const contentEditable = document.querySelector(
      state.noteFocus
        ? `[aria-label="note-editable"][data-thought-id="${thought.id}"]`
        : `[aria-label="editable-${thought.id}"]`,
    ) as HTMLElement | null
    if (!contentEditable) return

    // The current value of the note or thought being formatted (#3901).
    const value = state.noteFocus ? (noteValue(state, state.cursor) ?? '') : thought.value

    if (value.length === 0) return

    // Compute the plain-text character offsets [start, end) of the selection relative to the editable.
    const plainLength = contentEditable.textContent?.length ?? 0
    const range = selection.offsetRange(contentEditable)
    let start = range?.start ?? 0
    let end = range?.end ?? plainLength

    // Treat a collapsed caret (in a non-empty thought) or a full selection as formatting the whole thought.
    const selectionLength = end - start
    const whole = (selectionLength === 0 && plainLength !== 0) || selectionLength === plainLength
    if (whole) {
      start = 0
      end = plainLength
    }

    const newValue = formatSelectionHtml(value, {
      start,
      end,
      command,
      colorValue: color ? colors[color] : undefined,
      defaultColor: state.noteFocus ? colors.fg : colors.fgNote,
      defaultBackgroundColor: colors.bg,
    })

    // Update the toolbar command state when formatting a sub-range (the whole-thought state is derived from the caret).
    if (!whole) updateCommandState()

    const path = state.noteFocus ? resolveNotePath(state, state.cursor) : state.cursor

    if (newValue === value || !path) return

    dispatch(
      state.noteFocus
        ? setDescendant({
            path,
            values: [newValue],
          })
        : editThought({
            cursorOffset: range?.end,
            oldValue: value,
            newValue,
            path: simplifyPath(state, path),
            // force the ContentEditable to update
            force: true,
          }),
    )
  }
