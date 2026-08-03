/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { isSafari, isTouch } from '../browser'
import { ColorToken } from '../colors.config'
import morphHtml from '../device/morphHtml'
import * as selection from '../device/selection'
import globals from '../globals'
import noteValue from '../selectors/noteValue'
import pathToThought from '../selectors/pathToThought'
import resolveNotePath from '../selectors/resolveNotePath'
import simplifyPath from '../selectors/simplifyPath'
import themeColors from '../selectors/themeColors'
import { updateCommandState } from '../stores/commandStateStore'
import formatSelectionHtml, { FormatCommand } from '../util/formatSelectionHtml'
import { editThoughtActionCreator as editThought } from './editThought'
import { setDescendantActionCreator as setDescendant } from './setDescendant'
import { setNoteFocusActionCreator as setNoteFocus } from './setNoteFocus'

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
 *
 * Trade-offs:
 *
 * In order to avoid keyboard focus messiness, this is only called when the keyboard is open and the caret is on a thought.
 * This means that when the keyboard is closed, a native undo step will not be registered and the native undo stack will drift out of sync.
 * The native undo stack will already drift out of sync for unrelated reasons such as `undoTwice` behavior, and non-editing actions that are
 * undoable.
 *
 * Limitations:
 *
 * - The only way to intercept a native undo gesture is via the `beforeinput` event, which is only dispatched when the native undo stack has a step
 * to undo. When the stack drifts out of sync, the native dialog will not display an option to undo or redo past a certain point.
 * - If there are no editables, such as after undoing the creation of the only remaining thought, then there will be no `beforeinput` event and native
 * undo/redo behavior will stop having an effect. Technically, native undo is still running, but it doesn't know how to re-create a deleted thought.
 *
 * Returns true if a native undo step was registered, i.e. the live DOM was overwritten by the execCommand and must be
 * re-rendered from Redux rather than updated in place.
 */
const registerNativeUndoStep = (html: string): boolean => {
  if (!isTouch || !isSafari()) return false
  globals.suppressChange = true
  document.execCommand('insertHTML', false, html)
  globals.suppressChange = false
  return true
}

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
      defaultColor: state.noteFocus ? colors.fgNote : colors.fg,
      defaultBackgroundColor: colors.bg,
    })

    const path = state.noteFocus ? resolveNotePath(state, state.cursor) : state.cursor

    if (newValue === value || !path) return

    // Capture the caret's plain-text offset within the note before overwriting its value. Overwriting
    // re-renders the note's ContentEditable, which drops the caret; restoring the offset via setNoteFocus
    // places it back where the user left off instead of jumping to the start/end of the note (#4630).
    // noteFocus is only true when the caret is on a note, so it's not necessary to check whether the keyboard is open.
    const noteCaretOffset = state.noteFocus ? selection.offsetFromNode(contentEditable) : null

    // Only call document.execCommand when the keyboard is open and the caret is on a thought.
    // This avoids messy and buggy focus-management logic.
    const nativeUndoStep = state.isKeyboardOpen ? registerNativeUndoStep(newValue) : false

    // The selected range when the user has selected part of a thought — the only case where the browser holds a
    // visible selection that must survive the edit. null for a caret, a whole-thought selection, or a note.
    const partialRange = !whole && !state.noteFocus && range && range.start !== range.end ? range : null

    // Apply the formatting to the live editable in place, reusing the DOM nodes the selection is anchored in.
    // editThought below forces the ContentEditable to update, which assigns innerHTML and destroys every node — and
    // with them the native selection, which Android will not re-decorate with selection handles and a context menu
    // once it has been re-created programmatically (#4275). Updating the DOM in place first makes the assignment a
    // no-op (ContentEditable skips a write that would be identical), so the selection is never interrupted.
    // Skipped when a native undo step was registered, since that overwrites the editable with the whole new value and
    // relies on the forced re-render to restore it.
    if (partialRange && !nativeUndoStep) morphHtml(contentEditable, newValue)

    dispatch(
      state.noteFocus
        ? [
            setDescendant({
              path,
              values: [newValue],
            }),
            setNoteFocus({ value: true, offset: noteCaretOffset }),
          ]
        : [
            editThought({
              cursorOffset: range?.end,
              oldValue: value,
              newValue,
              path: simplifyPath(state, path),
              // force the ContentEditable to update
              force: true,
            }),
          ],
    )

    // Restore a partial selection that the forced re-render above collapsed to a caret (#4275).
    // This is the fallback for the cases that are not updated in place above (iOS, where a native undo step overwrites
    // the editable, and any markup the in-place update cannot reconcile): the re-render resets the editable's
    // innerHTML and sets a collapsed selection at the cursor offset, so the original range is re-applied on the next
    // tick using the plain-text offsets captured before the edit. Formatting never changes the plain text, so the
    // offsets still map to the correct nodes in the re-rendered DOM. Skipped when the selection already spans those
    // offsets, so a selection that survived in place is never replaced by a programmatic one, and when the editable is
    // no longer the active selection target, so focusing a different thought before the restore fires is not
    // overridden.
    if (partialRange) {
      const { start: selectionStart, end: selectionEnd } = partialRange
      setTimeout(() => {
        const current = selection.offsetRange(contentEditable)
        if (current?.start === selectionStart && current?.end === selectionEnd) return
        if (selection.isWithin(contentEditable)) selection.setRange(contentEditable, selectionStart, selectionEnd)
      })
    }

    // Update the toolbar command state when formatting a sub-range (the whole-thought state is derived from the caret).
    if (!whole || !state.isKeyboardOpen) updateCommandState()
  }
