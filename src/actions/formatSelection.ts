/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { isSafari, isTouch } from '../browser'
import { ColorToken } from '../colors.config'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import noteValue from '../selectors/noteValue'
import pathToThought from '../selectors/pathToThought'
import resolveNotePath from '../selectors/resolveNotePath'
import simplifyPath from '../selectors/simplifyPath'
import themeColors from '../selectors/themeColors'
import batchEditingStore from '../stores/batchEditing'
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

    if (
      (selection.text()?.length === 0 && strip(thought.value).length !== 0) ||
      selection.text()?.length === strip(thought.value).length
    ) {
      // Check the value of the note or thought for a custom background color (#3901)
      const hasCustomBackgroundColor = BACKGROUND_COLOR_REGEX.test(
        state.noteFocus ? (noteValue(state, state.cursor) ?? '') : thought.value,
      )
      const savedSelection = selection.save()
      const inputMode = contentEditable.getAttribute('inputmode')
      const editable = contentEditable as HTMLElement

      // Prevent the virtual keyboard from opening when the editable is focused
      if (isTouch && isSafari()) editable.setAttribute('inputmode', 'none')

      // Note that we must suppress focus events in the Editable component, otherwise selecting text will set editing:true on mobile.
      editable.focus({ preventScroll: true })
      selection.select(contentEditable)
      if (!(command === 'backColor' && color === 'bg' && !hasCustomBackgroundColor)) {
        document.execCommand(command, false, color ? colors[color] : '')
      }

      // Only restore the selection (which keeps the editable focused) when in edit mode.
      // On mobile, selecting the contentEditable to apply formatting re-focuses it; restoring the selection would
      // re-open the virtual keyboard even though the user had manually dismissed it. Clearing the selection blurs
      // the editable so the keyboard stays closed, matching the edit mode invariant (#3996).
      const editMode = !isTouch || state.isKeyboardOpen
      if (savedSelection && editMode) {
        selection.restore(savedSelection)
      } else {
        selection.clear()
      }

      if (isTouch && isSafari()) contentEditable.setAttribute('inputmode', inputMode ?? '')
    }
    // format selected text only
    else {
      document.execCommand(command, false, color ? colors[color] : '')
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

<<<<<<< HEAD
        /** Function to create a new text string with specified tags and their content removed. */
        const removeTags = (text: string, tags: string[]): string =>
          // Use reduce to accumulate a new string without the unwanted tags
          tags.reduce((acc, tagName) => {
            const openingTagPattern = new RegExp(`<${tagName}(\\s[^>]*)?>`, 'gi')
            const closingTagPattern = new RegExp(`</${tagName}>`, 'gi')
            // Replace both opening and closing tags with an empty string
            return acc.replace(openingTagPattern, '').replace(closingTagPattern, '')
          }, text)

        dispatch((dispatch, getState) => {
          const state = getState()
          if (!state.cursor) return

          const thought = getThoughtById(state, head(state.cursor))
          if (!thought) return
          const simplePath = simplifyPath(state, state.cursor)
          const styleAttrPattern = /style\s*=\s*["'][^"']*["']/gi
          const tagWithoutStylePattern = /<(span|font)(\s[^>]*)?>/gi

          //Replace style attributes based on the conditions
          const styleRemovedThought = thought.value.replace(styleAttrPattern, match => {
            if (shouldRemoveStyle(match)) return ''
            return match
          })
          const tagsToRemove = collectTagsWithoutAttributes(styleRemovedThought, tagWithoutStylePattern)
          const newValue = removeTags(styleRemovedThought, tagsToRemove)
          if (newValue !== thought.value)
            dispatch(
              editThought({
                cursorOffset: selection.offsetThought() ?? undefined,
                oldValue: thought.value,
                newValue: newValue,
                path: simplePath,
                // force the ContentEditable to update
                force: true,
                // merge with the preceding foreColor+backColor patch so that the entire color change
                // (foreColor + backColor + cleanup) is a single undo step
                mergePrev: batchEditingStore.getState(),
              }),
            )
        })
      }
=======
        // Overwrite the value of the thought or note with the stripped value in order to remove background highlighting (#3901)
        if (newValue !== value)
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
      })
>>>>>>> origin/main
    }
  }
