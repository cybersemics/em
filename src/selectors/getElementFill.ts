import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import getThoughtById from './getThoughtById'

const styleRegex = /style="[^"]*(background-)?color:\s*([^;"'>]+)[^"]*"/i
const fontColorRegex = /color="([^"]*)"/

/**
 * Checks if a string is wrapped in a single HTML tag (specifically font or span).
 * @param str - The string of html content to check.
 * @returns The boolean indicating if the string is wrapped in a single font or span tag.
 */
const isWrappedInSingleTag = (str: string): boolean => {
  // Check if there's any text before the first tag or after the last tag
  const firstTagIndex = str.indexOf('<')
  const lastTagIndex = str.lastIndexOf('>')

  if (firstTagIndex > 0 || lastTagIndex < str.length - 1) {
    return false
  }

  const tagStack: string[] = []
  let currentPos = 0

  while (currentPos < str.length) {
    // Find next tag
    const openIndex = str.indexOf('<', currentPos)
    if (openIndex === -1) break

    const closeIndex = str.indexOf('>', openIndex)
    if (closeIndex === -1) return false

    const tag = str.substring(openIndex, closeIndex + 1)
    currentPos = closeIndex + 1

    if (tag.startsWith('</')) {
      // Closing tag
      const tagName = tag.slice(2, -1).toLowerCase()
      // If stack is empty or last opening tag doesn't match, return false
      if (tagStack.length === 0 || tagStack[tagStack.length - 1] !== tagName) {
        return false
      }

      // Remove matching opening tag
      tagStack.pop()

      // If stack is empty before end of string, only valid if this is the last tag
      if (tagStack.length === 0 && currentPos <= str.length) {
        const remainingTags = str.slice(currentPos).match(/<\/?[a-z]+/g)
        return !remainingTags
      }
    } else if (!tag.endsWith('/>')) {
      // Opening tag (excluding self-closing tags)
      const tagName = tag.slice(1).split(/[\s>]/)[0].toLowerCase()
      tagStack.push(tagName)
    }
  }

  // Valid if exactly one tag remains in stack (the outer tag)
  return tagStack.length === 1 && (tagStack[0] === 'font' || tagStack[0] === 'span')
}

/**
 * Gets the fill color from a thought's value by checking style and font color attributes.
 * @param state - The Redux state.
 * @param thoughtId - The ID of the thought to check.
 * @returns The fill color or undefined if not found.
 */
const getElementFill = (state: State, thoughtId: ThoughtId | null): string | undefined => {
  if (!thoughtId) return undefined
  const thought = getThoughtById(state, thoughtId)
  if (!thought) return undefined

  const value = thought.value
  // Check if the entire value is wrapped in a single font or span tag
  const isWrappedInTag = isWrappedInSingleTag(value)
  if (isWrappedInTag) {
    // Check for background-color and color in style attribute
    const styleMatch = value.match(styleRegex)
    if (styleMatch) return styleMatch[2]

    // If no background-color, check for font color
    const fontColorMatch = value.match(fontColorRegex)
    if (fontColorMatch) return fontColorMatch[1]
  }

  return undefined
}

export default getElementFill
