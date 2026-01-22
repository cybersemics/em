/**
 * Safari does glyph-only hit testing, so clicking on empty space has no caret target.
 * This module provides API for detecting void area positions and calculating appropriate caret positions.
 */
import { isSafari } from '../browser'

/** Represents a line within a text node with its character range and bounding box. */
interface TextNodeLine {
  start: number
  end: number
  rect: DOMRect
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
 * Splits a text node into individual lines based on vertical position.
 * Returns an array of line objects with start/end character positions and bounding boxes.
 */
const getTextNodeLines = (node: Text): TextNodeLine[] => {
  const text = node.nodeValue ?? ''
  if (!text) return []

  const range = document.createRange()
  let lastRect: DOMRect | null = null

  return Array.from(text, (_, i) => {
    range.setStart(node, i)
    range.setEnd(node, i + 1)
    const rect = range.getBoundingClientRect()
    return rect.height ? { i, rect } : null
  })
    .filter((item): item is { i: number; rect: DOMRect } => item !== null)
    .reduce<TextNodeLine[]>((lines, { i, rect }) => {
      if (!lastRect || Math.abs(lastRect.top - rect.top) > rect.height / 2) {
        lines.push({ start: i, end: i + 1, rect })
      } else {
        lines[lines.length - 1].end = i + 1
      }
      lastRect = rect
      return lines
    }, [])
}

/**
 * Finds the character offset within a text node that corresponds to a given X coordinate.
 *
 * @param node - The text node to search within.
 * @param clientX - The X coordinate of the tap/click.
 * @param lo - Lower bound of the search range (character index).
 * @param hi - Upper bound of the search range (character index).
 * @returns The character offset where the caret should be placed.
 */
const findOffsetAtX = (node: Text, clientX: number, lo: number, hi: number): number => {
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
 * Adjusts an offset to skip trailing whitespaces in a line.
 * If the offset is in whitespace, moves it to after the last non-whitespace character in that line.
 *
 * @param text - The text content.
 * @param offset - The calculated offset.
 * @param lineStart - The start of the line containing the offset.
 * @param lineEnd - The end of the line containing the offset.
 * @returns The adjusted offset, skipping trailing whitespaces.
 */
const skipTrailingWhitespace = (text: string, offset: number, lineStart: number, lineEnd: number): number => {
  const lineText = text.substring(lineStart, lineEnd)
  const offsetInLine = offset - lineStart
  const lastNonWhitespaceIndex = lineText.trimEnd().length

  // If offset is beyond the last non-whitespace character, place after it
  if (offsetInLine > lastNonWhitespaceIndex) {
    return lineStart + lastNonWhitespaceIndex
  }

  /** If offset is in whitespace, find the last non-whitespace before it. */
  const isWhitespace = (char: string) => /\s/.test(char)

  if (isWhitespace(lineText[offsetInLine])) {
    // Find last non-whitespace character before the offset using reduceRight
    const charsBeforeOffset = Array.from(lineText.slice(0, offsetInLine))
    const lastNonWhitespaceIndex = charsBeforeOffset.reduceRight<number | null>(
      (foundIndex, char, index) => foundIndex ?? (!isWhitespace(char) ? index : null),
      null,
    )

    // If found, place after it; otherwise place at start of line
    return lastNonWhitespaceIndex !== null ? lineStart + lastNonWhitespaceIndex + 1 : lineStart
  }

  return offset
}

/**
 * Resolves the horizontal character offset within a text node using binary search.
 * Handles both single-line and multi-line text nodes.
 * Skips trailing whitespaces when placing the caret.
 *
 * @param node - The text node to search within.
 * @param clientX - The X coordinate of the tap/click.
 * @param clientY - The Y coordinate of the tap/click (used for multi-line text).
 * @returns The character offset where the caret should be placed.
 */
const calculateHorizontalOffset = (node: Text, clientX: number, clientY: number): number => {
  const text = node.nodeValue ?? ''
  if (!text) return 0

  const lines = getTextNodeLines(node)

  let offset: number
  let lineStart: number
  let lineEnd: number

  // If the text node is a single line, find the offset directly
  if (lines.length <= 1) {
    lineStart = 0
    lineEnd = text.length
    offset = findOffsetAtX(node, clientX, lineStart, lineEnd)
  } else {
    // If the text node is multi-line, pick the closest line with respect to the Y coordinate
    // and then find the offset within that line
    const targetLine = findClosestLine(lines, clientY)
    lineStart = targetLine.start
    lineEnd = targetLine.end
    offset = findOffsetAtX(node, clientX, lineStart, lineEnd)
  }

  // Safari-specific correction: Safari's getBoundingClientRect can be off by a few characters, so verify the result
  if (isSafari() && offset >= lineStart && offset <= lineEnd) {
    // Generate range of offsets to check (±2 characters)
    const startOffset = Math.max(lineStart, offset - 2)
    const endOffset = Math.min(lineEnd, offset + 2)
    const offsetsToCheck = Array.from({ length: endOffset - startOffset + 1 }, (_, i) => startOffset + i)

    /** Get distance for each offset and find the one closest to clientX. */
    const getDistance = (checkOffset: number): number => {
      const checkR = document.createRange()
      checkR.setStart(node, checkOffset)
      checkR.collapse(true)
      const checkRect = checkR.getBoundingClientRect()
      return Math.abs(clientX - checkRect.left)
    }

    const { offset: bestOffset } = offsetsToCheck
      .map(checkOffset => ({ offset: checkOffset, distance: getDistance(checkOffset) }))
      .reduce((best, current) => (current.distance < best.distance ? current : best), {
        offset,
        distance: getDistance(offset),
      })

    offset = bestOffset
  }

  // Adjust offset to skip trailing whitespaces
  return skipTrailingWhitespace(text, offset, lineStart, lineEnd)
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
 * @returns The character offset where the caret should be placed, or null if it is on a valid character.
 */
const getNodeOffsetForVoidArea = (editable: HTMLElement | null, { clientX, clientY }: Coordinates): number | null => {
  // If the editable is not found, return null
  if (!editable) return null

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
    return 0
  }

  const node = range.startContainer
  const offset = range.startOffset
  const nodeTextLength = node.textContent?.length || 0

  // If the node is empty (placeholder text), return caret position at offset 0
  if (nodeTextLength === 0) {
    return 0
  }

  /** Get the bounding rectangle for a character at the given offset. */
  const getCharRect = (targetOffset: number): DOMRect | null => {
    // Ensure targetOffset is within valid bounds
    if (targetOffset < 0 || targetOffset > nodeTextLength) {
      return null
    }

    const charRange = document.createRange()
    charRange.setStart(node, targetOffset)

    // If targetOffset is at the end, collapse the range to that position
    // Otherwise, set the end to targetOffset + 1 to get the character's bounding box
    if (targetOffset >= nodeTextLength) {
      charRange.collapse(true)
    } else {
      charRange.setEnd(node, targetOffset + 1)
    }

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
  if (isClickOnCharacter || isValidEdgeClick) {
    // For multiline thoughts, we need to check if the click is on a different line than the browser would naturally place the caret.
    const textNodes = getTextNodes(editable)
    if (textNodes.length === 0) return null

    const nearest = findNearestTextNode(textNodes, clientY)
    if (!nearest) return null

    // Check if the text node has multiple lines
    const lines = getTextNodeLines(nearest.node)
    if (lines.length > 1) {
      // For multiline text nodes, calculate the offset to ensure proper line selection
      return calculateHorizontalOffset(nearest.node, clientX, clientY)
    }

    // For single-line thoughts, allow default browser behavior
    return null
  }

  // Coordinates are in padding/void area, calculate the caret position
  const textNodes = getTextNodes(editable)
  if (textNodes.length === 0) return null

  const nearest = findNearestTextNode(textNodes, clientY)
  if (!nearest) return null

  return calculateHorizontalOffset(nearest.node, clientX, clientY)
}

export default getNodeOffsetForVoidArea
