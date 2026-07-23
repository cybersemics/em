/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { isSafari, isTouch } from '../browser'
import { ColorToken } from '../colors.config'
import { commandEmitter } from '../commands'
import * as selection from '../device/selection'
import noteValue from '../selectors/noteValue'
import pathToThought from '../selectors/pathToThought'
import resolveNotePath from '../selectors/resolveNotePath'
import simplifyPath from '../selectors/simplifyPath'
import themeColors from '../selectors/themeColors'
import { updateCommandState } from '../stores/commandStateStore'
import suppressChangeStore from '../stores/suppressChange'
import formatSelectionHtml, { FormatCommand } from '../util/formatSelectionHtml'
import { editThoughtActionCreator as editThought } from './editThought'
import { setDescendantActionCreator as setDescendant } from './setDescendant'

/**
 * Registers a single native undo step in WKWebView for a formatSelection edit on iOS.
 *
 * The DOMParser-based formatSelection applies formatting by re-rendering the contentEditable from Redux (editThought),
 * not via document.execCommand, so WebKit records no native undo step. Without a step, a native undo gesture
 * (shake-to-undo / three-finger swipe) has nothing to undo and fires no event — so the historyUndo `beforeinput` handler
 * that routes native undo through em's own undo (#3954) never runs (#4637).
 *
 * This performs a scoped execCommand purely so WebKit registers one native undo step per format. Its DOM effect is
 * immaterial: it is immediately overwritten by the editThought re-render, and the native undo it anchors is
 * preventDefaulted by the beforeinput handler (which dispatches em's undo instead). It exists only as the trigger that
 * makes the native undo gesture fire.
 *
 * No-op on non-iOS platforms (isTouch && isSafari gates iOS WKWebView; desktop Safari has no shake/three-finger undo).
 */
const registerNativeUndoStep = (html: string): void => {
  if (!isTouch || !isSafari()) return
  suppressChangeStore.update(true)
  document.execCommand('insertHTML', false, html)
  suppressChangeStore.update(false)
}

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

    const path = state.noteFocus ? resolveNotePath(state, state.cursor) : state.cursor

    if (newValue === value || !path) return

    // Only call document.execCommand when the keyboard is open and the caret is on a thought.
    // This avoids messy and buggy focus-management logic.
    if (state.isKeyboardOpen) registerNativeUndoStep(newValue)

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

    // Update the toolbar command state when formatting a sub-range (the whole-thought state is derived from the caret).
    if (!whole || !state.isKeyboardOpen) updateCommandState()
  }
