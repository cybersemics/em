/**
 * Safari does glyph-only hit testing, so clicking on empty space has no caret target.
 * This module provides API for detecting void area positions and calculating appropriate caret positions.
 */
import { isSafari, isTouch } from '../browser'

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
 * Checks if a click is in the valid end-of-line gap in a multiline text node.
 * This occurs when a word wraps to the next line, leaving horizontal space at the end of the previous line.
 * Returns true if the browser should handle this click naturally.
 */
const isValidEdgeClickInMultiline = (node: Node, offset: number, clientX: number, clientY: number): boolean => {
  // Only applicable to text nodes
  if (node.nodeType !== Node.TEXT_NODE) return false

  const textNode = node as Text
  const text = textNode.nodeValue ?? ''
  const lines = getTextNodeLines(textNode)

  // Only applicable to multiline text
  if (lines.length <= 1) return false

  // Find which line the click Y-coordinate is closest to
  const clickedLine = findClosestLine(lines, clientY)

  // Verify click is actually within this line's vertical bounds (with some tolerance)
  const verticalTolerance = clickedLine.rect.height * 0.5
  if (clientY < clickedLine.rect.top - verticalTolerance || clientY > clickedLine.rect.bottom + verticalTolerance) {
    return false
  }

  // Check if this is NOT the last line (meaning content wraps to next line)
  const isNotLastLine = clickedLine.end < text.length
  if (!isNotLastLine) return false

  // Find the last non-whitespace character in this line
  const lineText = text.substring(clickedLine.start, clickedLine.end)
  const trimmedLength = lineText.trimEnd().length

  if (trimmedLength === 0) return false

  const lastVisibleCharIndex = clickedLine.start + trimmedLength - 1

  // Get the bounding rect of the last visible character
  // For Safari, check multiple positions due to getBoundingClientRect inaccuracies
  const range = document.createRange()

  // Check the last few characters to account for Safari's ±2 character inaccuracy
  const checkIndices = isSafari()
    ? [
        lastVisibleCharIndex,
        Math.max(clickedLine.start, lastVisibleCharIndex - 1),
        Math.max(clickedLine.start, lastVisibleCharIndex - 2),
      ]
    : [lastVisibleCharIndex]

  let rightmostPosition = -Infinity

  for (const charIndex of checkIndices) {
    range.setStart(textNode, charIndex)
    range.setEnd(textNode, charIndex + 1)
    const rect = range.getBoundingClientRect()
    rightmostPosition = Math.max(rightmostPosition, rect.right)
  }

  // iOS Safari: Add extra tolerance for gap detection
  const horizontalTolerance = isSafari() && isTouch ? 5 : 2

  // Click is in the gap if it's beyond the rightmost visible character position
  const isInGap = clientX > rightmostPosition + horizontalTolerance

  if (!isInGap) return false

  // Additional check: verify the offset the browser gave us is actually at or near the line end
  // This helps catch cases where Safari reports an offset that doesn't match the click position
  const offsetNearLineEnd = offset >= clickedLine.end - 3 && offset <= clickedLine.end

  // For iOS Safari, also check if the browser-detected offset is trying to place
  // the caret at the beginning of the NEXT line
  if (isSafari() && isTouch) {
    const nextLine = lines.find(line => line.start === clickedLine.end)
    if (nextLine) {
      // If offset points to start of next line, this is likely a gap click
      if (offset === nextLine.start) return true
    }
  }

  return offsetNearLineEnd
}

/**
 * Finds word boundaries around a given offset.
 * Returns the start and end indices of the word containing the offset.
 * A word is defined as a sequence of non-whitespace characters.
 */
const findWordBoundaries = (text: string, offset: number): { start: number; end: number } | null => {
  // If offset is beyond text length or text is empty
  if (offset < 0 || offset > text.length || text.length === 0) {
    return null
  }

  // If offset is at the end, check the character before it
  const checkIndex = offset === text.length ? offset - 1 : offset

  // If the character at the check position is whitespace, no word boundary snapping needed
  if (checkIndex >= 0 && checkIndex < text.length && /\s/.test(text[checkIndex])) {
    return null
  }

  // Find the start of the word (move backwards until we hit whitespace or start)
  let start = checkIndex
  while (start > 0 && !/\s/.test(text[start - 1])) {
    start--
  }

  // Find the end of the word (move forwards until we hit whitespace or end)
  let end = checkIndex
  while (end < text.length && !/\s/.test(text[end])) {
    end++
  }

  return { start, end }
}

/**
 * Snaps an offset to the nearest word boundary (iOS Safari behavior).
 * If the offset is within a word, it snaps to either the start or end of the word, whichever is closer.
 */
const snapToWordBoundary = (text: string, offset: number): number => {
  const boundaries = findWordBoundaries(text, offset)

  if (!boundaries) {
    return offset
  }

  const { start, end } = boundaries

  // If already at a boundary, don't change
  if (offset === start || offset === end) {
    return offset
  }

  // Calculate distance to start and end
  const distToStart = offset - start
  const distToEnd = end - offset

  // Snap to the closer boundary (prefer end if equal distance)
  return distToEnd <= distToStart ? end : start
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

  // iOS Safari: snap to word boundary like native iOS behavior
  if (isSafari() && isTouch) {
    offset = snapToWordBoundary(text, offset)
  }

  return offset
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
 * Checks if a click coordinate is actually within the visible character bounds of a text node.
 * This is more accurate than checking the overall bounding box, especially for text nodes
 * with trailing spaces that extend beyond visible characters.
 */
const isClickWithinTextNodeCharacters = (node: Text, clientX: number, clientY: number): boolean => {
  const text = node.nodeValue ?? ''
  if (!text.trim()) return false // ignore pure whitespace nodes

  const range = document.createRange()

  for (let i = 0; i < text.length; i++) {
    // Skip whitespace characters early
    if (/\s/.test(text[i])) continue

    range.setStart(node, i)
    range.setEnd(node, i + 1)

    const rects = Array.from(range.getClientRects())

    for (const rect of rects) {
      if (rect.height === 0 || rect.width === 0) continue

      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return true
      }
    }
  }

  return false
}

/**
 * Calculates the minimum distance from a click coordinate to any visible character in a text node.
 * Returns both the distance and the bounding rectangle of the closest character.
 */
const getDistanceToNearestCharacter = (
  node: Text,
  clientX: number,
  clientY: number,
): { dist: number; rect: DOMRect } => {
  const text = node.nodeValue ?? ''
  const range = document.createRange()

  let minDist = Infinity
  let closestRect: DOMRect | null = null

  for (let i = 0; i < text.length; i++) {
    if (/\s/.test(text[i])) continue

    range.setStart(node, i)
    range.setEnd(node, i + 1)

    const rects = Array.from(range.getClientRects())

    for (const rect of rects) {
      if (rect.height === 0 || rect.width === 0) continue

      const verticalDist = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0

      const horizontalDist = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0

      const dist = verticalDist * 1000 + horizontalDist

      if (dist < minDist) {
        minDist = dist
        closestRect = rect
      }
    }
  }

  // Fallback: whole node box (still needed for empty/whitespace cases)
  if (!closestRect) {
    range.selectNodeContents(node)
    const rect = range.getBoundingClientRect()

    const verticalDist = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0
    const horizontalDist = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0

    minDist = verticalDist * 1000 + horizontalDist
    closestRect = rect
  }

  return { dist: minDist, rect: closestRect }
}

/**
 * Finds the nearest text node to given coordinates by calculating distance to visible characters.
 * Returns the text node with the smallest distance to its nearest visible character.
 * Prioritizes text nodes where the click is directly inside visible character bounds.
 */
const findNearestTextNode = (textNodes: Text[], clientX: number, clientY: number): TextNodeWithRect | null => {
  const nodesWithinCharBounds = textNodes.filter(node => isClickWithinTextNodeCharacters(node, clientX, clientY))

  if (nodesWithinCharBounds.length > 0) {
    const node = nodesWithinCharBounds[0]
    const range = document.createRange()
    range.selectNodeContents(node)
    return { node, rect: range.getBoundingClientRect() }
  }

  return (
    textNodes.reduce<{ result: TextNodeWithRect; dist: number } | null>((closest, node) => {
      const { dist, rect } = getDistanceToNearestCharacter(node, clientX, clientY)

      if (!closest || dist < closest.dist) {
        return { result: { node, rect }, dist }
      }

      return closest
    }, null)?.result ?? null
  )
}

/**
 * Converts a DOM position (node + offset) in the real element to a plain-text offset.
 */
const domPositionToUnformattedOffset = (root: HTMLElement, node: Node, offset: number): number => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let globalOffset = 0
  let currentNode: Text | null
  while ((currentNode = walker.nextNode() as Text | null)) {
    if (currentNode === node) {
      return globalOffset + offset
    }
    globalOffset += currentNode.nodeValue?.length ?? 0
  }
  return globalOffset
}

/** Returns the offset of the nearest text node to the given coordinates. */
const getOffset = (editable: HTMLElement, clientX: number, clientY: number): number | null => {
  const textNodes = getTextNodes(editable)
  if (textNodes.length === 0) {
    // Empty thought: place caret at 0 if tap is within editable bounds
    const rect = editable.getBoundingClientRect()
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      return 0
    }
    return null
  }

  const nearest = findNearestTextNode(textNodes, clientX, clientY)
  if (!nearest) return null

  const offsetInNode = calculateHorizontalOffset(nearest.node, clientX, clientY)
  return domPositionToUnformattedOffset(editable, nearest.node, offsetInNode)
}

/**
 * Detects if a coordinate is in a void area and calculates the appropriate caret position.
 *
 * A void area is defined as:
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

  // Ensure the coordinates are within our editable element, if not manually calculate the offset
  if (!range || !editable.contains(range.startContainer)) {
    return getOffset(editable, clientX, clientY)
  }

  const node = range.startContainer
  const offset = range.startOffset
  const nodeTextLength = node.textContent?.length || 0

  // If the node is empty (placeholder text), return caret position at offset 0
  if (nodeTextLength === 0) return 0

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

  // For iOS Safari, expand the range of offsets to check due to positioning inaccuracies
  const offsetsToCheck = isSafari()
    ? [offset, offset - 1, offset + 1].filter(o => o >= 0 && o < nodeTextLength)
    : [offset, offset - 1].filter(o => o >= 0 && o < nodeTextLength)

  // Check whether the coordinates land on the character at the current offset or the one before it.
  const isClickOnCharacter = offsetsToCheck.some(checkOffset => isInsideCharRect(getCharRect(checkOffset)))

  // Allow coordinates horizontally beyond text if vertically aligned with the text line
  const isValidEdgeClick =
    (offset === 0 || offset === nodeTextLength) &&
    isVerticallyContained(getCharRect(offset === 0 ? 0 : nodeTextLength - 1))

  // Check for end-of-line gaps in multiline text
  const isMultilineEdgeClick = isValidEdgeClickInMultiline(node, offset, clientX, clientY)

  // Let browser handle if clicking on a character, valid edge, or multiline gap
  if (isClickOnCharacter || isValidEdgeClick || isMultilineEdgeClick) return null

  const offsetResult = getOffset(editable, clientX, clientY)
  return offsetResult
}

export default getNodeOffsetForVoidArea
