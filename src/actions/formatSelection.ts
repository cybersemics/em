/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { ColorToken } from '../colors.config'
import { ALLOWED_ATTR } from '../constants'
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

/** Checks if a DOM element is a color-setting element (font tag or span with color/background-color). */
const isColorElement = (el: Element): boolean => {
  const tag = el.tagName.toLowerCase()
  if (tag === 'font') return true
  if (tag === 'span') {
    const style = (el as HTMLElement).style
    return !!(style.color || style.backgroundColor)
  }
  return false
}

/**
 * Moves color tags outside of text decoration tags to fix text-decoration-color inheritance.
 * When a color element (font/span) is the sole child of a decoration element (u/strike),
 * the decoration uses the parent element's inherited color rather than the color element's color,
 * resulting in white underlines/strikethroughs in dark mode.
 * e.g. `<u><font color="#000000">text</font></u>` → `<font color="#000000"><u>text</u></font>`.
 */
const normalizeColoredDecoration = (html: string): string => {
  const div = document.createElement('div')
  div.innerHTML = html

  // Process bottom-up (deepest first) to correctly handle nested decorations
  const decorationElements = Array.from(div.querySelectorAll('u, strike'))
  for (let i = decorationElements.length - 1; i >= 0; i--) {
    const decorEl = decorationElements[i]
    // Only normalize when the decoration has exactly one child that is a color element
    if (decorEl.childNodes.length !== 1) continue
    const child = decorEl.firstElementChild
    if (!child || !isColorElement(child)) continue

    // Move child's children into a new decoration element, then wrap with the color element
    // <u><font color="...">content</font></u> → <font color="..."><u>content</u></font>
    const newDecoration = document.createElement(decorEl.tagName.toLowerCase())
    while (child.firstChild) {
      newDecoration.appendChild(child.firstChild)
    }
    child.appendChild(newDecoration)
    decorEl.parentNode!.replaceChild(child, decorEl)
  }

  return div.innerHTML
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

      // Normalize the HTML after applying foreColor to fix text-decoration-color inheritance.
      // When foreColor wraps decoration tags (u/strike), the decoration uses the parent's
      // inherited color (e.g. white in dark mode) instead of the foreColor value.
      // Normalizing moves the color tag outside the decoration tag so the decoration
      // inherits the correct color.
      if (command === 'foreColor') {
        const normalizedHTML = normalizeColoredDecoration(contentEditable.innerHTML)
        if (normalizedHTML !== contentEditable.innerHTML) {
          contentEditable.innerHTML = normalizedHTML
          contentEditable.dispatchEvent(new InputEvent('input', { bubbles: true }))
        }
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

          // Could be formatting either a thought or a note (#3901)
          const value = state.noteFocus
            ? noteValue(state, state.cursor)
            : getThoughtById(state, head(state.cursor))?.value
          if (!value) return

          const path = state.noteFocus ? resolveNotePath(state, state.cursor) : state.cursor
          if (!path) return

          const styleAttrPattern = /style\s*=\s*["'][^"']*["']/gi
          const tagWithoutStylePattern = /<(span|font)(\s[^>]*)?>/gi

          //Replace style attributes based on the conditions
          const styleRemovedThought = value.replace(styleAttrPattern, match => {
            if (shouldRemoveStyle(match)) return ''
            return match
          })
          const tagsToRemove = collectTagsWithoutAttributes(styleRemovedThought, tagWithoutStylePattern)
          const newValue = removeTags(styleRemovedThought, tagsToRemove)

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
