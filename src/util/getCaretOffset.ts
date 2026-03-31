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

interface CaretOffsetResult {
  /** True if the tap/click is in a void area (i.e. outside the text node's visible characters). */
  inVoidArea?: boolean
  offset: number | null
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

/** Checks if a character is a word separator for caret snap purposes (whitespace or hyphen). */
const isWordSeparator = (char: string): boolean => /[\s\-]/.test(char)

/**
 * Finds word boundaries around a given offset.
 * Returns the start and end indices of the word containing the offset.
 * A word is delimited by whitespace or hyphens.
 */
const findWordBoundaries = (text: string, offset: number): { start: number; end: number } | null => {
  if (offset < 0 || offset > text.length || text.length === 0) {
    return null
  }

  const checkIndex = offset === text.length ? offset - 1 : offset

  if (checkIndex >= 0 && checkIndex < text.length && isWordSeparator(text[checkIndex])) {
    return null
  }

  let start = checkIndex
  while (start > 0 && !isWordSeparator(text[start - 1])) {
    start--
  }

  let end = checkIndex
  while (end < text.length && !isWordSeparator(text[end])) {
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
 * Converts a tap position (clientX, clientY) into the correct caret position within a text node.
 * The vertical coordinate determines the line, and the horizontal coordinate determines the position within that line.
 * Used when the browser places the caret incorrectly, such as in empty areas or at the end of a word.
 *
 * @param node - The text node to search within.
 * @param clientX - The X coordinate of the tap/click (position within the line).
 * @param clientY - The Y coordinate of the tap/click (selects which line in multiline text).
 * @returns The character offset (index) where the caret should be placed.
 */
const calculateOffset = (node: Text, clientX: number, clientY: number): number => {
  const text = node.nodeValue ?? ''
  if (!text) return 0

  const lines = getTextNodeLines(node)
  const targetLine = findClosestLine(lines, clientY)
  const lineStart = targetLine.start
  const lineEnd = targetLine.end
  let offset = findOffsetAtX(node, clientX, lineStart, lineEnd)

  // // Safari: getBoundingClientRect can be off by a few characters (±2 characters); pick the offset whose caret is closest to clientX
  if (isSafari() && offset >= lineStart && offset <= lineEnd) {
    const lo = Math.max(lineStart, offset - 2)
    const hi = Math.min(lineEnd, offset + 2)
    const r = document.createRange()
    let bestOffset = offset
    let bestDist = Infinity
    for (let i = lo; i <= hi; i++) {
      r.setStart(node, i)
      r.collapse(true)
      const d = Math.abs(clientX - r.getBoundingClientRect().left)
      if (d < bestDist) {
        bestDist = d
        bestOffset = i
      }
    }
    offset = bestOffset
  }

  // iOS Safari: snap to word boundary like native iOS behavior
  if (isSafari() && isTouch) {
    offset = snapToWordBoundary(text, offset)
  }

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

  // Treat line-edge gaps (left of first char / right of last char) as valid positions
  // so that taps in the editable padding near boundary characters are not void areas.
  const lines = getTextNodeLines(node)
  for (const line of lines) {
    if (clientY < line.rect.top || clientY > line.rect.bottom) continue

    range.setStart(node, line.start)
    range.setEnd(node, line.end)
    const lineRect = range.getBoundingClientRect()
    const tolerance = line.rect.height * 0.5
    if (clientX >= lineRect.left - tolerance && clientX <= lineRect.right + tolerance) {
      return true
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

/**
 * Calculates the appropriate caret position for a given click/tap coordinate.
 * Also detects if the click/tap is in a void area or within valid character bounds.
 * A void area is defined as:
 * - Empty space (padding, margins, line height gaps) within the editable element.
 * - Areas where the browser cannot detect a valid caret position.
 * - Coordinates that are not directly on visible characters.
 *
 * @param editable - The editable element containing the text.
 * @param clientX - The X coordinate.
 * @param clientY - The Y coordinate.
 * @returns The character offset where the caret should be placed, and a boolean indicating if the click/tap is in a void area.
 */
const getCaretOffset = (editable: HTMLElement | null, { clientX, clientY }: Coordinates): CaretOffsetResult => {
  if (!editable) return { offset: null }

  const textNodes = getTextNodes(editable)
  if (textNodes.length === 0) return { offset: null }

  const nearest = findNearestTextNode(textNodes, clientX, clientY)
  if (!nearest) return { offset: null }

  const offsetInNode = calculateOffset(nearest.node, clientX, clientY)
  return {
    inVoidArea: !isClickWithinTextNodeCharacters(nearest.node, clientX, clientY),
    offset: domPositionToUnformattedOffset(editable, nearest.node, offsetInNode),
  }
}

export default getCaretOffset
