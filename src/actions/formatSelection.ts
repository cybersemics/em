/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { ColorToken } from '../colors.config'
import { ALLOWED_ATTR } from '../constants'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import pathToThought from '../selectors/pathToThought'
import simplifyPath from '../selectors/simplifyPath'
import themeColors from '../selectors/themeColors'
import { updateCommandState } from '../stores/commandStateStore'
import suppressFocusStore from '../stores/suppressFocus'
import head from '../util/head'
import rgbToHex from '../util/rgbToHex'
import strip from '../util/strip'
import { editThoughtActionCreator as editThought } from './editThought'

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
    const thoughtContentEditable = document.querySelector(`[aria-label="editable-${thought.id}"]`)
    if (!thoughtContentEditable) return

    if (
      (selection.text()?.length === 0 && strip(thought.value).length !== 0) ||
      selection.text()?.length === strip(thought.value).length
    ) {
      const hasCustomBackgroundColor = /background-color\s*:\s*[^;]+;?/.test(thought.value)
      const savedSelection = selection.save()
      // Note that we must suppress focus events in the Editable component, otherwise selecting text will set editing:true on mobile.
      selection.select(thoughtContentEditable)
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
        /** Function to check if a style(background) should be removed based on the color and background-color. */
        const shouldRemoveStyle = (styleString: string) => {
          const styleLower = styleString.toLowerCase()
          const colorMatch = styleLower.match(/background-color\s*:\s*([^;]+);?/)
          const elementColor = colorMatch ? colorMatch[1].trim() : null
          const isSameColor = elementColor && rgbToHex(elementColor) === rgbToHex(colors.bg)
          if (elementColor && isSameColor) return true
          return false
        }

        /** Function to collect tag names without significant attributes. */
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
              }),
            )
        })
      }
    }
  }
