/** These functions use binary search algorithms for efficient caret position calculations within text nodes. */
import textNodeUtils, { TextNodeLine } from './textNodeUtils'

/**
 * Performs binary search to find the character offset within a text node
 * that corresponds to a given X coordinate.
 *
 * @param node - The text node to search within.
 * @param clientX - The X coordinate of the tap/click.
 * @param lo - Lower bound of the search range (character index).
 * @param hi - Upper bound of the search range (character index).
 * @returns The character offset where the caret should be placed.
 */
const binarySearchOffset = (node: Text, clientX: number, lo: number, hi: number): number => {
  while (lo < hi) {
    const mid = (lo + hi) >> 1

    const r = document.createRange()
    r.setStart(node, mid)
    r.setEnd(node, Math.min(mid + 1, hi))

    const rect = r.getBoundingClientRect()

    if (clientX < rect.left) {
      hi = mid
    } else if (clientX > rect.right) {
      lo = mid + 1
    } else {
      const center = rect.left + rect.width / 2
      return clientX < center ? mid : mid + 1
    }
  }

  return lo
}

/**
 * Calculates the vertical distance from a Y coordinate to a line's bounding rectangle.
 * Returns 0 if the coordinate is within the line vertically.
 */
const getLineDistance = (clientY: number, rect: DOMRect): number =>
  clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0

/** Finds the closest line to a Y coordinate within an array of lines. */
const findClosestLine = (lines: TextNodeLine[], clientY: number): TextNodeLine => {
  return lines.reduce<{ line: TextNodeLine; dist: number }>(
    (closest, line) => {
      const dist = getLineDistance(clientY, line.rect)
      return dist < closest.dist ? { line, dist } : closest
    },
    { line: lines[0], dist: Infinity },
  ).line
}

/**
 * Resolves the horizontal character offset within a text node using binary search.
 * Handles both single-line and multi-line text nodes.
 *
 * For multi-line text, it first finds the closest line vertically, then performs
 * binary search within that line.
 *
 * @param node - The text node to search within.
 * @param clientX - The X coordinate of the tap/click.
 * @param clientY - The Y coordinate of the tap/click (used for multi-line text).
 * @returns The character offset where the caret should be placed.
 */
const calculateHorizontalOffset = (node: Text, clientX: number, clientY: number): number => {
  const text = node.nodeValue ?? ''
  if (!text) return 0

  const lines = textNodeUtils.getTextNodeLines(node)

  // If the text node is a single line, use binary search to find the offset
  if (lines.length <= 1) {
    return binarySearchOffset(node, clientX, 0, text.length)
  }

  // If the text node is multi-line, pick the closest line with respect to the Y coordinate
  // and then do binary search within that line
  const targetLine = findClosestLine(lines, clientY)

  // Binary search only inside that line
  return binarySearchOffset(node, clientX, targetLine.start, targetLine.end)
}

export default calculateHorizontalOffset
