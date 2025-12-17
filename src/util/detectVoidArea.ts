/**
 * Safari does glyph-only hit testing, so clicking on empty space has no caret target.
 * This module provides API for detecting void area positions and calculating appropriate caret positions.
 */
import calculateHorizontalOffset from './caretPositioning'

/** Represents the result of void area detection with caret position information. */
interface CaretPositionInfo {
  /** The text node where the caret should be placed, or null if no valid position found. */
  node: Text | null
  /** The character offset within the text node. */
  nodeOffset: number
}

/** Represents a text node with its bounding rectangle. */
interface TextNodeWithRect {
  node: Text
  rect: DOMRect
}

interface Coordinates {
  clientX: number
  clientY: number
}
/**
 * Gets all text nodes within an element that can receive a caret.
 * Filters out empty or whitespace-only text nodes.
 */
const getTextNodes = (root: HTMLElement): Text[] => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    },
  })
  const nodes: Text[] = []
  let n: Text | null
  while ((n = walker.nextNode() as Text | null)) nodes.push(n)
  return nodes
}

/**
 * Finds the nearest text node to a given Y coordinate by calculating vertical distance.
 * Returns the text node with the smallest vertical distance to the coordinate.
 */
const findNearestTextNode = (textNodes: Text[], clientY: number): TextNodeWithRect | null => {
  return textNodes.reduce<TextNodeWithRect | null>((closest, node) => {
    const range = document.createRange()
    range.selectNodeContents(node)
    const rect = range.getBoundingClientRect()

    const dist = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0

    if (!closest) return { node, rect }

    const closestDist =
      clientY < closest.rect.top
        ? closest.rect.top - clientY
        : clientY > closest.rect.bottom
          ? clientY - closest.rect.bottom
          : 0

    return dist < closestDist ? { node, rect } : closest
  }, null)
}

/**
 * Detects if a coordinate is in a void area and calculates the appropriate caret position.
 *
 * A void area is defined as.
 * - Empty space (padding, margins, line height gaps) within the editable element.
 * - Areas where the browser cannot detect a valid caret position.
 * - Coordinates that are not directly on visible characters.
 *
 * @param editable - The editable element containing the text.
 * @param clientX - The X coordinate.
 * @param clientY - The Y coordinate.
 * @returns Caret position info if it's a void area position, null if it is on a valid character.
 */
const detectVoidArea = (editable: HTMLElement, { clientX, clientY }: Coordinates): CaretPositionInfo | null => {
  const doc = document as Document

  // These APIs are not available in test environments (JSDOM)
  // In that case, return null to let the browser handle it normally
  if (!doc.caretRangeFromPoint && !doc.caretPositionFromPoint) {
    return null
  }

  // Get the browser range for the given point
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

  // Ensure the coordinates are within our editable element
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

  /** Check if the coordinates are within a character's bounding box. */
  const isInsideCharRect = (rect: DOMRect | null): boolean => {
    if (!rect) return false
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  }

  /** Check if the coordinates are vertically contained within the character's bounding box. */
  const isVerticallyContained = (rect: DOMRect | null): boolean => {
    if (!rect) return false
    return clientY >= rect.top && clientY <= rect.bottom
  }

  // Check whether the coordinates land on the character at the current offset or the one before it.
  const isClickOnCharacter = [offset, offset - 1]
    .filter(o => o >= 0 && o < nodeTextLength)
    .some(checkOffset => isInsideCharRect(getCharRect(checkOffset)))

  // Allow coordinates horizontally beyond text if vertically aligned with the text line
  const isValidEdgeClick =
    (offset === 0 || offset === nodeTextLength) &&
    isVerticallyContained(getCharRect(offset === 0 ? 0 : nodeTextLength - 1))

  // Valid coordinates on character, not a void area
  if (isClickOnCharacter || isValidEdgeClick) return null

  // Coordinates are in padding/void area, calculate the caret position
  const textNodes = getTextNodes(editable)
  if (textNodes.length === 0) return null

  const nearest = findNearestTextNode(textNodes, clientY)
  if (!nearest) return null

  const nodeOffset = calculateHorizontalOffset(nearest.node, clientX, clientY)
  return { node: nearest.node, nodeOffset }
}

export default detectVoidArea
