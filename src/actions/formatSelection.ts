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
import strip from '../util/strip'
import { editThoughtActionCreator as editThought } from './editThought'
import { setDescendantActionCreator as setDescendant } from './setDescendant'

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
      const hasCustomBackgroundColor = /background-color\s*:\s*[^;]+;?/.test(
        state.noteFocus ? (noteValue(state, state.cursor) ?? '') : thought.value,
      )
      const savedSelection = selection.save()
      // Note that we must suppress focus events in the Editable component, otherwise selecting text will set editing:true on mobile.
      selection.select(contentEditable)
      if (!(command === 'backColor' && color === 'bg' && !hasCustomBackgroundColor)) {
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
      document.execCommand(command, false, color ? colors[color] : '')
      updateCommandState()
    }

    suppressFocusStore.update(false)

    if (command === 'backColor') {
      if (color === 'bg') {
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
            // Unwrap tags that have no meaningful style or color attributes
            if (!el.getAttribute('style')?.trim() && !el.getAttribute('color')?.trim()) {
              el.replaceWith(...Array.from(el.childNodes))
            }
          }

          const newValue = doc.body.innerHTML

          // Overwrite the value of the thought or note with the stripped value in order to remove background highlighting (#3901)
          if (newValue !== value)
            dispatch(
              state.noteFocus
                ? setDescendant({
                    path,
                    values: [newValue],
                  })
                : editThought({
                    cursorOffset: selection.offsetThought() ?? undefined,
                    oldValue: value,
                    newValue: newValue,
                    path: simplifyPath(state, path),
                    // force the ContentEditable to update
                    force: true,
                  }),
            )
        })
      }
    }
  }
