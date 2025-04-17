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
  (
    command: 'bold' | 'italic' | 'strikethrough' | 'underline' | 'code' | 'foreColor' | 'backColor',
    color?: ColorToken,
  ): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    if (!state.cursor) return
    const thought = pathToThought(state, state.cursor)
    if (!thought) return
    const colors = themeColors(state)
    suppressFocusStore.update(true)
    // if there is no selection, format the entire thought by selecting the whole thought
    const thoughtContentEditable = document.querySelector(`[aria-label="editable-${thought.id}"]`)
    if (!thoughtContentEditable) return

    const savedSelection = selection.save()
    const selectionText = selection.text()
    const isCollapsedSelection = selection.isCollapsed()
    const isEmptyThought = !thought.value || strip(thought.value).length === 0

    // Prevent wrapping empty thought with empty span on collapsed selection
    if (isCollapsedSelection && isEmptyThought) {
      suppressFocusStore.update(false)
      return
    }

    const shouldSelectEntireThought =
      (!selectionText || selectionText.length === 0) && strip(thought.value).length !== 0

    /** Returns the corresponding inline CSS style string based on the provided formatting command and color. */
    const getInlineStyle = (): string => {
      switch (command) {
        case 'bold':
          return 'font-weight: bold;'
        case 'italic':
          return 'font-style: italic;'
        case 'underline':
          return 'text-decoration: underline;'
        case 'strikethrough':
          return 'text-decoration: line-through;'
        case 'code':
          return 'font-family: monospace;'
        case 'foreColor':
          return `color: ${color ? colors[color] : ''};`
        case 'backColor':
          return `background-color: ${color ? colors[color] : ''};`
        default:
          return ''
      }
    }

    /**
     * Applies the specified inline formatting to the selected text or the entire thought content.
     * If the formatting already exists, it toggles it off. Handles both new formatting and unwrapping styles.
     */
    const applyFormatting = () => {
      // eslint-disable-next-line no-restricted-properties
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return

      const contentEditable = document.querySelector(`[aria-label="editable-${thought.id}"]`)
      if (!contentEditable) return

      const range = sel.getRangeAt(0)

      // Check if selection is inside contentEditable
      if (!contentEditable.contains(range.commonAncestorContainer)) return

      // CASE 1: Collapsed selection (no text selected) or should format the whole thought
      if (range.collapsed || shouldSelectEntireThought) {
        // Format entire thought
        const fullRange = document.createRange()
        fullRange.selectNodeContents(contentEditable)

        const firstElem = contentEditable.firstElementChild as HTMLElement | null
        let toggled = false

        if (firstElem && firstElem.tagName.toLowerCase() === 'span') {
          switch (command) {
            case 'bold':
              if (firstElem.style.fontWeight === 'bold' || firstElem.style.fontWeight === '700') {
                firstElem.style.fontWeight = ''
                toggled = true
              } else {
                firstElem.style.fontWeight = 'bold'
              }
              break
            case 'italic':
              if (firstElem.style.fontStyle === 'italic') {
                firstElem.style.fontStyle = ''
                toggled = true
              } else {
                firstElem.style.fontStyle = 'italic'
              }
              break
            case 'underline':
              if (firstElem.style.textDecoration.includes('underline')) {
                firstElem.style.textDecoration = firstElem.style.textDecoration.replace('underline', '').trim()
                toggled = true
              } else {
                firstElem.style.textDecoration = (firstElem.style.textDecoration + ' underline').trim()
              }
              break
            case 'strikethrough':
              if (firstElem.style.textDecoration.includes('line-through')) {
                firstElem.style.textDecoration = firstElem.style.textDecoration.replace('line-through', '').trim()
                toggled = true
              } else {
                firstElem.style.textDecoration = (firstElem.style.textDecoration + ' line-through').trim()
              }
              break
            case 'code':
              if (firstElem.style.fontFamily.toLowerCase().includes('monospace')) {
                firstElem.style.fontFamily = ''
                toggled = true
              } else {
                firstElem.style.fontFamily = 'monospace'
              }
              break
            case 'foreColor':
              if (firstElem.style.color === (color ? colors[color] : '')) {
                firstElem.style.color = ''
                toggled = true
              } else {
                firstElem.style.color = color ? colors[color] : ''
              }
              break
            case 'backColor':
              if (firstElem.style.backgroundColor === (color ? colors[color] : '')) {
                firstElem.style.backgroundColor = ''
                toggled = true
              } else {
                firstElem.style.backgroundColor = color ? colors[color] : ''
              }
              break
          }

          const remainingStyles = firstElem.getAttribute('style')
          if (toggled && (!remainingStyles || remainingStyles.trim() === '')) {
            while (firstElem.firstChild) {
              contentEditable.insertBefore(firstElem.firstChild, firstElem)
            }
            contentEditable.removeChild(firstElem)
          }

          selection.restore(savedSelection)
          return
        }

        // Not already wrapped — apply style to entire content
        const wrapper = document.createElement('span')
        wrapper.setAttribute('style', getInlineStyle())

        try {
          wrapper.appendChild(fullRange.extractContents())
          fullRange.insertNode(wrapper)
          selection.restore(savedSelection)
        } catch (e) {
          console.error('Failed to apply formatting:', e)
        }

        return
      }

      // CASE 2: Non-collapsed selection — wrap selected part only
      const wrapper = document.createElement('span')
      wrapper.setAttribute('style', getInlineStyle())

      try {
        wrapper.appendChild(range.extractContents())
        range.insertNode(wrapper)

        // Move cursor after inserted node
        sel.removeAllRanges()
        const newRange = document.createRange()
        newRange.setStartAfter(wrapper)
        newRange.collapse(true)
        sel.addRange(newRange)

        // Restore previous selection after inserting new wrapper
        selection.restore(savedSelection)
      } catch (e) {
        console.error('Failed to apply formatting:', e)
      }
    }

    requestAnimationFrame(() => {
      applyFormatting()
      updateCommandState()
      suppressFocusStore.update(false)

      const contentEditable = document.querySelector(`[aria-label="editable-${thought.id}"]`)
      const updatedContent = contentEditable?.innerHTML ?? ''
      if (updatedContent && updatedContent !== thought.value) {
        const simplePath = simplifyPath(getState(), getState().cursor!)
        dispatch(
          editThought({
            oldValue: thought.value,
            newValue: updatedContent,
            path: simplePath,
            cursorOffset: selection.offsetThought() ?? undefined,
            force: true,
          }),
        )
      }
    })

    // Additional cleanup for backColor === bg
    if (command === 'backColor' && color === 'bg') {
      /** Function to check if a style(background) should be removed based on the color and background-color. */
      const shouldRemoveStyle = (styleString: string) => {
        const styleLower = styleString.toLowerCase()
        const colorMatch = styleLower.match(/background-color\s*:\s*([^;]+);?/)
        const elementColor = colorMatch ? colorMatch[1].trim() : null
        const isSameColor = elementColor && rgbToHex(elementColor) === rgbToHex(colors.bg)
        return Boolean(elementColor && isSameColor)
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
        const styleRemovedThought = thought.value.replace(styleAttrPattern, match =>
          shouldRemoveStyle(match) ? '' : match,
        )

        const tagsToRemove = collectTagsWithoutAttributes(styleRemovedThought, tagWithoutStylePattern)
        const newValue = removeTags(styleRemovedThought, tagsToRemove)
        if (newValue !== thought.value) {
          dispatch(
            editThought({
              cursorOffset: selection.offsetThought() ?? undefined,
              oldValue: thought.value,
              newValue,
              path: simplePath,
              // force the ContentEditable to update
              force: true,
            }),
          )
        }
      })
    }
  }
