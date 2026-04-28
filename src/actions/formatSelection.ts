/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { ColorToken } from '../colors.config'
import { ALLOWED_ATTR } from '../constants'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
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

/** Checks if a style attribute string contains a background-color matching the given bg color and should be removed. */
const shouldRemoveStyle = (styleString: string, bgColor: string) => {
  const styleLower = styleString.toLowerCase()
  const colorMatch = styleLower.match(/background-color\s*:\s*([^;]+);?/)
  const elementColor = colorMatch ? colorMatch[1].trim() : null
  return !!(elementColor && rgbToHex(elementColor) === rgbToHex(bgColor))
}
/** Collects tag names from an HTML string that have no meaningful attributes. */
const collectTagsWithoutAttributes = (text: string, pattern: RegExp): string[] =>
  Array.from(text.matchAll(pattern))
    // Filter out tags that lack meaningful attributes
    .filter(([, , attributes]) => {
      const meaningfulAttributes = ALLOWED_ATTR.map(attr => `${attr}=`)
      // Return true if attributes are absent or do not contain any meaningful attributes
      return !attributes || !meaningfulAttributes.some(attr => attributes.includes(attr))
    })
    // Map to extract the tag names from matches
    .map(([, tagName]) => tagName)

/** Removes the specified tags and their content from an HTML string. */
const removeTags = (text: string, tags: string[]): string =>
  // Use reduce to accumulate a new string without the unwanted tags
  tags.reduce((acc, tagName) => {
    const openingTagPattern = new RegExp(`<${tagName}(\\s[^>]*)?>`, 'gi')
    const closingTagPattern = new RegExp(`</${tagName}>`, 'gi')
    // Replace both opening and closing tags with an empty string
    return acc.replace(openingTagPattern, '').replace(closingTagPattern, '')
  }, text)

/** Strips background-color styles from an HTML value and removes any resulting empty tags. */
const stripBackgroundColor = (value: string, bgColor: string): string => {
  const styleAttrPattern = /style\s*=\s*["'][^"']*["']/gi
  const tagWithoutStylePattern = /<(span|font)(\s[^>]*)?>/gi

  const styleRemovedValue = value.replace(styleAttrPattern, match => (shouldRemoveStyle(match, bgColor) ? '' : match))
  const tagsToRemove = collectTagsWithoutAttributes(styleRemovedValue, tagWithoutStylePattern)
  return removeTags(styleRemovedValue, tagsToRemove)
}

/** Applies a color execCommand to an HTML string using a temporary hidden contenteditable element and returns the resulting HTML. */
const applyColorToHtml = (html: string, command: string, colorValue: string): string => {
  const div = document.createElement('div')
  div.contentEditable = 'true'
  div.setAttribute('aria-hidden', 'true')
  div.style.cssText = 'position:fixed;top:-9999px;opacity:0;pointer-events:none;width:1px;height:1px;overflow:hidden;'
  document.body.appendChild(div)

  div.innerHTML = html

  // Select all content in the temporary div and apply the execCommand.
  const savedSelection = selection.save()
  selection.select(div)
  document.execCommand(command, false, colorValue)

  const result = div.innerHTML
  if (savedSelection) {
    selection.restore(savedSelection)
  } else {
    selection.clear()
  }
  document.body.removeChild(div)

  return result
}

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

    // Multicursor: apply foreColor/backColor to all selected thoughts programmatically.
    if (hasMulticursor(state) && (command === 'foreColor' || command === 'backColor')) {
      const paths = Object.values(state.multicursors)
      const colorValue = color ? colors[color] : ''

      dispatch(
        paths.map(path => {
          const pathThought = pathToThought(state, path)
          if (!pathThought) return null
          const oldValue = pathThought.value
          const newValue =
            command === 'backColor' && color === 'bg'
              ? // Strip background color from the thought value.
                stripBackgroundColor(oldValue, colors.bg)
              : applyColorToHtml(oldValue, command, colorValue)
          return newValue !== oldValue
            ? editThought({ oldValue, newValue, path: simplifyPath(state, path), force: true })
            : null
        }),
      )

      suppressFocusStore.update(false)
      return
    }

    // format whole thought (if there is no selection)
    const contentEditable = document.querySelector(
      state.noteFocus
        ? `[aria-label="note-editable"][data-thought-id="${thought.id}"]`
        : `[aria-label="editable-${thought.id}"]`,
    )
    if (!contentEditable) {
      suppressFocusStore.update(false)
      return
    }

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

          const newValue = stripBackgroundColor(value, colors.bg)

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
