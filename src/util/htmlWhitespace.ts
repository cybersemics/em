import getTextContentFromHTML from '../device/getTextContentFromHTML'

/**
 * Checks if HTML content has any whitespace at the edges (leading or trailing).
 *
 * @param html The HTML string to check.
 * @returns True if the HTML has leading or trailing whitespace.
 */
const hasEdgeWhitespace = (html: string): boolean => {
  const plainText = getTextContentFromHTML(html)
  return /^\s+|\s+$/.test(plainText)
}

export default hasEdgeWhitespace
