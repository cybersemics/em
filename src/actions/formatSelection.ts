/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { isAndroidWebView, isSafari, isTouch } from '../browser'
import { ColorToken } from '../colors.config'
import * as selection from '../device/selection'
import globals from '../globals'
import hasMulticursor from '../selectors/hasMulticursor'
import noteValue from '../selectors/noteValue'
import pathToThought from '../selectors/pathToThought'
import resolveNotePath from '../selectors/resolveNotePath'
import simplifyPath from '../selectors/simplifyPath'
import themeColors from '../selectors/themeColors'
import { updateCommandState } from '../stores/commandStateStore'
import formatSelectionHtml, { FormatCommand } from '../util/formatSelectionHtml'
import rgbToHex from '../util/rgbToHex'
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
 */
const registerNativeUndoStep = (html: string): void => {
  if (!isTouch || !isSafari()) return
  globals.suppressChange = true
  document.execCommand('insertHTML', false, html)
  globals.suppressChange = false
}

/** Returns true when two supported CSS color strings resolve to the same RGB value. */
const colorsMatch = (a: string, b: string): boolean => {
  try {
    return rgbToHex(a).toLowerCase() === rgbToHex(b).toLowerCase()
  } catch {
    return false
  }
}

/** Removes redundant default color artifacts created by native color commands from the live editable. */
const stripRedundantColors = (root: ParentNode, defaultBackground: string, defaultColor: string): void => {
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('font, span'))) {
    let removedRedundantColor = false
    if (el.style.backgroundColor && colorsMatch(el.style.backgroundColor, defaultBackground)) {
      el.style.removeProperty('background-color')
      removedRedundantColor = true
    }
    if (el.style.color && colorsMatch(el.style.color, defaultColor)) {
      el.style.removeProperty('color')
      removedRedundantColor = true
    }
    const colorAttribute = el.getAttribute('color')
    if (colorAttribute && colorsMatch(colorAttribute, defaultColor)) {
      el.removeAttribute('color')
      removedRedundantColor = true
    }
    if (!el.getAttribute('style')?.trim()) {
      el.removeAttribute('style')
    }
    if (removedRedundantColor && el.attributes.length === 0) {
      el.replaceWith(...Array.from(el.childNodes))
    }
  }
}

/**
 * Applies a partial thought color through Chromium's native editing commands so Android retains its native selection
 * handles and context menu. The resulting live HTML is persisted verbatim to keep the DOM and Redux in sync.
 */
const applyNativeAndroidColor = (
  contentEditable: HTMLElement,
  command: 'foreColor' | 'backColor',
  colorValue: string,
  defaultBackground: string,
  defaultColor: string,
): string => {
  const selectedBackground = selection.backgroundColor(contentEditable)
  const hasCustomSelectedBackground = selectedBackground !== null && !colorsMatch(selectedBackground, defaultBackground)
  const wasSuppressingChange = globals.suppressChange

  globals.suppressChange = true
  try {
    if (command === 'foreColor') {
      document.execCommand('foreColor', false, colorValue)
      if (hasCustomSelectedBackground) {
        document.execCommand('backColor', false, defaultBackground)
      }
    } else {
      const clearingBackground = colorsMatch(colorValue, defaultBackground)
      document.execCommand('foreColor', false, clearingBackground ? defaultColor : '#000000')
      document.execCommand('backColor', false, colorValue)
    }
    stripRedundantColors(contentEditable, defaultBackground, defaultColor)
  } finally {
    globals.suppressChange = wasSuppressingChange
  }

  return contentEditable.innerHTML
}

/** Format the browser selection or cursor thought as bold, italic, strikethrough, underline, code, color, or removeFormat.
 * Computes the new HTML synchronously and dispatches a single editThought/setDescendant. Android partial colors use a
 * native editing command so Chromium retains its native selection UI (#4275, #4637).
 */
export const formatSelectionActionCreator =
  (command: FormatCommand, color?: ColorToken): Thunk =>
  (dispatch, getState) => {
    const state = getState()

    // Multicursor: apply the color to each selected thought in full, since there is no browser selection.
    if (hasMulticursor(state) && (command === 'foreColor' || command === 'backColor')) {
      const colors = themeColors(state)
      dispatch(
        Object.values(state.multicursors).map(path => {
          const thought = pathToThought(state, path)
          if (!thought) return null
          const newValue = formatSelectionHtml(thought.value, {
            command,
            colorValue: color ? colors[color] : undefined,
            defaultColor: colors.fg,
            defaultBackgroundColor: colors.bg,
          })
          return newValue !== thought.value
            ? editThought({
                oldValue: thought.value,
                newValue,
                path: simplifyPath(state, path),
                // force the ContentEditable to update
                force: true,
              })
            : null
        }),
      )
      return
    }

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

    const formattedValue = formatSelectionHtml(value, {
      start,
      end,
      command,
      colorValue: color ? colors[color] : undefined,
      defaultColor: state.noteFocus ? colors.fgNote : colors.fg,
      defaultBackgroundColor: colors.bg,
    })

    const path = state.noteFocus ? resolveNotePath(state, state.cursor) : state.cursor

    if (formattedValue === value || !path) return

    const partialThought = !whole && !state.noteFocus
    const nativeAndroidColor =
      partialThought && isAndroidWebView() && (command === 'foreColor' || command === 'backColor')
    const newValue = nativeAndroidColor
      ? applyNativeAndroidColor(
          contentEditable,
          command,
          color ? colors[color] : command === 'foreColor' ? colors.fg : colors.bg,
          colors.bg,
          colors.fg,
        )
      : formattedValue

    if (newValue === value) return

    // Capture the caret's plain-text offset within the note before overwriting its value. Overwriting
    // re-renders the note's ContentEditable, which drops the caret; restoring the offset via setNoteFocus
    // places it back where the user left off instead of jumping to the start/end of the note (#4630).
    // noteFocus is only true when the caret is on a note, so it's not necessary to check whether the keyboard is open.
    const noteCaretOffset = state.noteFocus ? selection.offsetFromNode(contentEditable) : null

    // Only call document.execCommand when the keyboard is open and the caret is on a thought.
    // This avoids messy and buggy focus-management logic.
    if (state.isKeyboardOpen) registerNativeUndoStep(newValue)

    // Keep partial thought formatting synchronous with the live editable. Restoring the range immediately after the
    // write preserves the logical selection on normal platforms without a deferred callback.
    if (partialThought && !nativeAndroidColor) {
      contentEditable.innerHTML = newValue
      selection.setRange(contentEditable, start, end)
    }

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
              // Force the ContentEditable to update when formatting the whole thought. Partial thought formatting is
              // applied to the live DOM above without a forced render.
              force: whole,
            }),
          ],
    )

    // Update the toolbar command state when formatting a sub-range (the whole-thought state is derived from the caret).
    if (!whole || !state.isKeyboardOpen) updateCommandState()
  }
