/**
 * Safari does glyph-only hit testing, so tapping/clicking on empty space has no caret target.
 * This module provides a clean API for detecting void area taps and calculating appropriate
 * caret positions.
 */
import calculateHorizontalOffset from './caretPositioning'
import textNodeUtils from './textNodeUtils'

/** Represents the result of void area detection with caret position information. */
interface CaretPositionInfo {
  /** The text node where the caret should be placed, or null if no valid position found. */
  node: Text | null
  /** The character offset within the text node. */
  nodeOffset: number
}

/**
 * Detects if a tap/click is in a void area and calculates the appropriate caret position.
 *
 * A void area is defined as.
 * - Empty space (padding, margins, line height gaps) within the editable element.
 * - Areas where the browser cannot detect a valid caret position.
 * - Taps that are not directly on visible characters.
 *
 * @param editable - The editable element containing the text.
 * @param clientX - The X coordinate of the tap/click.
 * @param clientY - The Y coordinate of the tap/click.
 * @returns Caret position info if it's a void area tap, null if tap is on a valid character.
 */
const detectVoidAreaTap = (editable: HTMLElement, clientX: number, clientY: number): CaretPositionInfo | null => {
  const doc = document as Document

  // These APIs are not available in test environments (JSDOM)
  // In that case, return a fallback result
  if (!doc.caretRangeFromPoint && !doc.caretPositionFromPoint) {
    return { node: null, nodeOffset: 0 }
  }

  // Get the browser range for the tap position
  let range: Range | null = null

  if (doc.caretRangeFromPoint) {
    range = doc.caretRangeFromPoint(clientX, clientY)
  } else if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(clientX, clientY)
    if (pos?.offsetNode) {
      range = document.createRange()
      range.setStart(pos.offsetNode, pos.offset)
      range.collapse(true)
    }
  }

  // Ensure tap is within our editable element
  if (!range || !editable.contains(range.startContainer)) {
    return { node: null, nodeOffset: 0 }
  }

  const node = range.startContainer
  const offset = range.startOffset
  const nodeTextLength = node.textContent?.length || 0

  /** Get the bounding rectangle for a character at the given offset. */
  const getCharRect = (targetOffset: number): DOMRect | null => {
    const charRange = document.createRange()
    charRange.setStart(node, targetOffset)
    charRange.setEnd(node, targetOffset + 1)
    return charRange.getBoundingClientRect()
  }

  /** Check if tap is within a character's bounding box. */
  const isInsideCharRect = (rect: DOMRect | null): boolean => {
    if (!rect) return false
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  }

  /** Check if tap is vertically contained within the character's bounding box. */
  const isVerticallyContained = (rect: DOMRect | null): boolean => {
    if (!rect) return false
    return clientY >= rect.top && clientY <= rect.bottom
  }

  // Check by tapping on a character at the current offset and the one before it.
  const isClickOnCharacter = [offset, offset - 1]
    .filter(o => o >= 0 && o < nodeTextLength)
    .some(checkOffset => isInsideCharRect(getCharRect(checkOffset)))

  // Allow taps horizontally beyond text if vertically aligned with text line
  const isValidEdgeClick =
    (offset === 0 || offset === nodeTextLength) &&
    isVerticallyContained(getCharRect(offset === 0 ? 0 : nodeTextLength - 1))

  // Valid tap on character, not a void area
  if (isClickOnCharacter || isValidEdgeClick) return null

  // Invalid tap (padding/void area), calculate the caret position
  const textNodes = textNodeUtils.getTextNodes(editable)
  if (textNodes.length === 0) return null

  const nearest = textNodeUtils.findNearestTextNode(textNodes, clientY)
  if (!nearest) return null

  const nodeOffset = calculateHorizontalOffset(nearest.node, clientX, clientY)
  return { node: nearest.node, nodeOffset }
}

export default detectVoidAreaTap
