/* eslint-disable import/prefer-default-export */
import { rgbToHex } from '@mui/material'
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
import strip from '../util/strip'
import { editThoughtActionCreator as editThought } from './editThought'

/** Format the browser selection or cursor thought as bold, italic, strikethrough, underline. */
export const formatSelectionActionCreator =
  (command: 'bold' | 'italic' | 'strikethrough' | 'underline' | 'foreColor' | 'backColor', color?: ColorToken): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    if (!state.cursor) return
    const colors = themeColors(state)
    const thought = pathToThought(state, state.cursor)
    suppressFocusStore.update(true)
    // if there is no selection, format the entire thought by selecting the whole thought
    const thoughtContentEditable = document.querySelector(`[aria-label="editable-${thought.id}"]`)
    if (!thoughtContentEditable) return
    if (selection.text()?.length === 0 && thought.value.length !== 0) {
      const savedSelection = selection.save()
      // must suppress focus events in the Editable component, otherwise selecting text will set editing:true on mobile
      selection.select(thoughtContentEditable)
      document.execCommand(command, false, color ? colors[color] : '')
      selection.restore(savedSelection)
    } else {
      document.execCommand(command, false, color ? colors[color] : '')
      updateCommandState()
    }
    suppressFocusStore.update(false)

    if (command === 'backColor') {
      if (color === 'bg') {
        /** Function to check if a style(background) should be removed based on the color and background-color. */
        const shouldRemoveStyle = (styleString: string) => {
          const styleLower = styleString.toLowerCase()
          const colorMatch = styleLower.match(/color\s*:\s*([^;]+);?/)
          const elementColor = colorMatch ? colorMatch[1].trim() : null
          const isDifferentColor = elementColor && elementColor !== rgbToHex(colors.bg)
          if (elementColor && isDifferentColor) return true
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
          if (
            thought.value.length !== 0 &&
            (selection.text()?.length === 0 || selection.text()?.length === strip(thought.value).length)
          ) {
            const savedSelection = selection.save()
            selection.select(thoughtContentEditable)
            document.execCommand('delete')
            document.execCommand('insertHTML', false, newValue)
            selection.restore(savedSelection)
          }

          dispatch(
            editThought({
              oldValue: thought.value,
              newValue: newValue,
              path: simplePath,
            }),
          )
        })
      }
    }
  }
