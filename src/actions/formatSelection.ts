/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { isTouch } from '../browser'
import { ColorToken } from '../colors.config'
import registerNativeUndoStep from '../device/registerNativeUndoStep'
import * as selection from '../device/selection'
import noteValue from '../selectors/noteValue'
import pathToThought from '../selectors/pathToThought'
import resolveNotePath from '../selectors/resolveNotePath'
import simplifyPath from '../selectors/simplifyPath'
import themeColors from '../selectors/themeColors'
import { updateCommandState } from '../stores/commandStateStore'
import suppressFocusStore from '../stores/suppressFocus'
import formatSelectionHtml, { FormatCommand } from '../util/formatSelectionHtml'
import { editThoughtActionCreator as editThought } from './editThought'
import { setDescendantActionCreator as setDescendant } from './setDescendant'

/** Format the browser selection or cursor thought as bold, italic, strikethrough, underline, code, color, or removeFormat.
 * Computes the new HTML synchronously with the DOM (no document.execCommand) and dispatches a single editThought/setDescendant (#4637). */
export const formatSelectionActionCreator =
  (command: FormatCommand, color?: ColorToken): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    if (!state.cursor) return
    const thought = pathToThought(state, state.cursor)
    if (!thought) return
    const colors = themeColors(state)
    suppressFocusStore.update(true)

    const contentEditable = document.querySelector(
      state.noteFocus
        ? `[aria-label="note-editable"][data-thought-id="${thought.id}"]`
        : `[aria-label="editable-${thought.id}"]`,
    ) as HTMLElement | null
    if (!contentEditable) {
      suppressFocusStore.update(false)
      return
    }

    // Was the editable was already focused (keyboard open) when formatting was invoked? When false (e.g. formatting the whole thought from the toolbar with the keyboard closed), precautions against the keyboard opening must be applied in registerNativeUndoStep.
    const editMode = !isTouch || state.isKeyboardOpen || false

    // The current value of the note or thought being formatted (#3901).
    const value = state.noteFocus ? (noteValue(state, state.cursor) ?? '') : thought.value

    if (value.length === 0) {
      suppressFocusStore.update(false)
      return
    }

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

    // On iOS (Safari and Capacitor, both WKWebView), register a native undo step for this format while focus is still
    // suppressed. The value is applied via editThought below rather than document.execCommand, so WebKit records no
    // native step; without one, a shake/three-finger native undo gesture fires nothing and the historyUndo beforeinput
    // handler that routes native undo through em's own undo never runs (#3954, #4637). The registered step's DOM effect
    // is overwritten by the editThought re-render; it exists only as the trigger for the native undo gesture.
    if (newValue !== value && path) registerNativeUndoStep(contentEditable, newValue, editMode)

    suppressFocusStore.update(false)

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
