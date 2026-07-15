/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { ColorToken } from '../colors.config'
import * as selection from '../device/selection'
import noteValue from '../selectors/noteValue'
import pathToThought from '../selectors/pathToThought'
import resolveNotePath from '../selectors/resolveNotePath'
import simplifyPath from '../selectors/simplifyPath'
import themeColors from '../selectors/themeColors'
import { mergeBatchEditing } from '../stores/batchEditing'
import { updateCommandState } from '../stores/commandStateStore'
import suppressFocusStore from '../stores/suppressFocus'
import formatSelectionHtml, { FormatCommand } from '../util/formatSelectionHtml'
import rgbToHex from '../util/rgbToHex'
import { editThoughtActionCreator as editThought } from './editThought'
import { setDescendantActionCreator as setDescendant } from './setDescendant'

const BACKGROUND_COLOR_REGEX = /background-color\s*:\s*[^;]+;?/i

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

    // The current value of the note or thought being formatted (#3901).
    const value = state.noteFocus ? (noteValue(state, state.cursor) ?? '') : thought.value

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

    // Preserve the special case where re-applying the default background color over a value that has no custom
    // background color is a no-op (#3901).
    const hasCustomBackgroundColor = BACKGROUND_COLOR_REGEX.test(value)
    const skip = command === 'backColor' && color === 'bg' && !hasCustomBackgroundColor

    let newValue = value
    if (!skip) {
      newValue = formatSelectionHtml(value, {
        start,
        end,
        command,
        colorValue: color ? colors[color] : undefined,
        whole,
      })
    }

    // Cleanup pass (folded in from the former async thunk): remove background-color/color that matches the default
    // and unwrap font/span tags that have no meaningful attributes (#3901).
    if (command === 'backColor' || command === 'foreColor') {
      const doc = new DOMParser().parseFromString(newValue, 'text/html')
      for (const el of Array.from(doc.body.querySelectorAll<HTMLElement>('font, span'))) {
        // Remove background-color if it matches the default background color
        if (el.style.backgroundColor && rgbToHex(el.style.backgroundColor) === rgbToHex(colors.bg)) {
          el.style.removeProperty('background-color')
          if (!el.getAttribute('style')?.trim()) {
            el.removeAttribute('style')
          }
        }

        // Remove color if it matches the default text color, whether expressed as a color attribute
        // (e.g. <font color="#ffffff">) or a style (e.g. <span style="color: ...">).
        const defaultColorHex = rgbToHex(state.noteFocus ? colors.fg : colors.fgNote)
        const colorAttr = el.getAttribute('color')
        if (colorAttr && rgbToHex(colorAttr) === defaultColorHex) {
          el.removeAttribute('color')
        }
        if (el.style.color && rgbToHex(el.style.color) === defaultColorHex) {
          el.style.removeProperty('color')
        }

        // Unwrap tags that have no meaningful style or color attributes
        if (!el.getAttribute('style')?.trim() && !el.getAttribute('color')?.trim()) {
          el.replaceWith(...Array.from(el.childNodes))
        }
      }
      newValue = doc.body.innerHTML
    }

    // Update the toolbar command state when formatting a sub-range (the whole-thought state is derived from the caret).
    if (!whole) updateCommandState()

    suppressFocusStore.update(false)

    if (newValue === value) return

    const path = state.noteFocus ? resolveNotePath(state, state.cursor) : state.cursor
    if (!path) return

    // Dispatch a single synchronous edit. foreColor + backColor land in the same (synchronous) batch window and merge
    // into a single undo step via mergeBatchEditing (#4620).
    dispatch(
      state.noteFocus
        ? setDescendant({
            path,
            values: [newValue],
            mergePrev: mergeBatchEditing(),
          })
        : editThought({
            cursorOffset: end,
            oldValue: value,
            newValue,
            path: simplifyPath(state, path),
            // force the ContentEditable to update
            force: true,
            mergePrev: mergeBatchEditing(),
          }),
    )
  }
