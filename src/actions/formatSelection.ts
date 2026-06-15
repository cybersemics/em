/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { ColorToken } from '../colors.config'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import noteValue from '../selectors/noteValue'
import pathToThought from '../selectors/pathToThought'
import resolveNotePath from '../selectors/resolveNotePath'
import simplifyPath from '../selectors/simplifyPath'
import themeColors from '../selectors/themeColors'
import { updateCommandState } from '../stores/commandStateStore'
import suppressFocusStore from '../stores/suppressFocus'
import head from '../util/head'
import rgbToHex from '../util/rgbToHex'
import strip from '../util/strip'
import { editThoughtActionCreator as editThought } from './editThought'
import { setDescendantActionCreator as setDescendant } from './setDescendant'

const BACKGROUND_COLOR_REGEX = /background-color\s*:\s*[^;]+;?/i

/** Format the browser selection or cursor thought as bold, italic, strikethrough, underline. */
export const formatSelectionActionCreator =
  (
    command: 'bold' | 'italic' | 'strikethrough' | 'underline' | 'code' | 'foreColor' | 'backColor' | 'removeFormat',
    color?: ColorToken,
  ): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    if (!state.cursor) return
    const thought = pathToThought(state, state.cursor)
    if (!thought) return
    const colors = themeColors(state)
    suppressFocusStore.update(true)

    // format whole thought (if there is no selection)
    const contentEditable = document.querySelector(
      state.noteFocus
        ? `[aria-label="note-editable"][data-thought-id="${thought.id}"]`
        : `[aria-label="editable-${thought.id}"]`,
    )
    if (!contentEditable) return

    // A whole-thought (or empty) selection formats the entire thought/note; a partial selection formats only the selected text.
    const isWholeThought =
      (selection.text()?.length === 0 && strip(thought.value).length !== 0) ||
      selection.text()?.length === strip(thought.value).length

    // Check for a custom background color to clear, scoped to the region being formatted.
    // For a whole-thought (or empty) selection the thought/note value is the relevant scope (#3901).
    // For a partial selection only the selected text matters (#4275): a background color elsewhere in
    // the thought must not count, otherwise the redundant default-background write below would force a
    // ContentEditable re-render that dismisses the active selection. selection.html() returns only the
    // selected fragment, so a background color on a different substring is excluded, while a background
    // color overlapping any part of the selection is included and will be cleared by the reset (#4275).
    const hasCustomBackgroundColor = BACKGROUND_COLOR_REGEX.test(
      isWholeThought
        ? state.noteFocus
          ? (noteValue(state, state.cursor) ?? '')
          : thought.value
        : (selection.html() ?? ''),
    )

    // Skip resetting the background color to the default when there is no custom background color to clear.
    // Applying the default background color adds a span that the post-processing below immediately strips,
    // forcing a ContentEditable re-render that dismisses an active partial selection (#4275).
    const skipDefaultBackgroundColor = command === 'backColor' && color === 'bg' && !hasCustomBackgroundColor

    // Capture the partial selection boundaries (as plain-text offsets relative to the editable) before any
    // DOM mutation. When clearing a background color forces a ContentEditable re-render below, the selection
    // collapses to a caret; these offsets are used to restore the selection afterwards (#4275). Tags added by
    // execCommand and removed by post-processing never change the plain text, so the offsets remain valid.
    const savedSelectionOffsets = isWholeThought ? null : selection.offsetsInRoot(contentEditable)

    if (isWholeThought) {
      const savedSelection = selection.save()
      // Note that we must suppress focus events in the Editable component, otherwise selecting text will set editing:true on mobile.
      selection.select(contentEditable)
      if (!skipDefaultBackgroundColor) {
        document.execCommand(command, false, color ? colors[color] : '')
      }

      if (savedSelection) {
        selection.restore(savedSelection)
      } else {
        selection.clear()
      }
    }
    // format selected text only
    else {
      if (!skipDefaultBackgroundColor) {
        document.execCommand(command, false, color ? colors[color] : '')
      }
      updateCommandState()
    }

    suppressFocusStore.update(false)

    if (command === 'backColor' || command === 'foreColor') {
      dispatch((dispatch, getState) => {
        const state = getState()
        if (!state.cursor) return

        // Could be formatting either a thought or a note (#3901)
        const value = state.noteFocus
          ? noteValue(state, state.cursor)
          : getThoughtById(state, head(state.cursor))?.value
        if (!value) return

        const path = state.noteFocus ? resolveNotePath(state, state.cursor) : state.cursor
        if (!path) return

        // Use DOMParser to remove background-color and unwrap font/span tags that have no meaningful attributes
        const doc = new DOMParser().parseFromString(value, 'text/html')

        for (const el of Array.from(doc.body.querySelectorAll<HTMLElement>('font, span'))) {
          // Remove background-color if it matches the default background color
          if (el.style.backgroundColor && rgbToHex(el.style.backgroundColor) === rgbToHex(colors.bg)) {
            el.style.removeProperty('background-color')
            if (!el.getAttribute('style')?.trim()) {
              el.removeAttribute('style')
            }
          }

          // Remove color if it matches the default text color
          if (el.style.color && rgbToHex(el.style.color) === rgbToHex(state.noteFocus ? colors.fg : colors.fgNote)) {
            el.style.removeProperty('color')
          }

          // Unwrap tags that have no meaningful style or color attributes
          if (!el.getAttribute('style')?.trim() && !el.getAttribute('color')?.trim()) {
            el.replaceWith(...Array.from(el.childNodes))
          }
        }

        const newValue = doc.body.innerHTML

        // Overwrite the value of the thought or note with the stripped value in order to remove background highlighting (#3901)
        if (newValue !== value) {
          dispatch(
            state.noteFocus
              ? setDescendant({
                  path,
                  values: [newValue],
                  mergePrev: true,
                })
              : editThought({
                  cursorOffset: selection.offsetThought() ?? undefined,
                  oldValue: value,
                  newValue: newValue,
                  path: simplifyPath(state, path),
                  // force the ContentEditable to update
                  force: true,
                  mergePrev: true,
                }),
          )

          // Restore a partial selection that the forced re-render above collapsed to a caret (#4275).
          // The re-render resets the editable's innerHTML and sets a collapsed selection at the cursor
          // offset, so the original selection range is re-applied on the next tick (after that reset)
          // using the plain-text offsets captured before the edit. The plain text is unchanged by the
          // edit, so the offsets still map to the correct nodes in the re-rendered DOM.
          if (savedSelectionOffsets && savedSelectionOffsets.start !== savedSelectionOffsets.end) {
            const { start, end } = savedSelectionOffsets
            setTimeout(() => selection.setRange(contentEditable, start, end))
          }
        }
      })
    }
  }
