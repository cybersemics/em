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

const WORD_SEPARATOR_REGEX = /[\s\-\p{P}]/u
const WHITESPACE_REGEX = /\s/

/** Returns the number of UTF-16 code units for the code point at the given index (2 for surrogate pairs, 1 otherwise). */
const codePointSize = (text: string, i: number): number =>
  i < text.length - 1 && text.charCodeAt(i) >= 0xd800 && text.charCodeAt(i) <= 0xdbff ? 2 : 1

/** Checks if the code unit at the given index is a low surrogate (second half of a surrogate pair). */
const isLowSurrogate = (text: string, i: number): boolean =>
  i > 0 && i < text.length && text.charCodeAt(i) >= 0xdc00 && text.charCodeAt(i) <= 0xdfff

/**
 * Splits a text node into individual lines based on vertical position.
 * Returns an array of line objects with start/end character positions and bounding boxes.
 */
const getTextNodeLines = (node: Text): TextNodeLine[] => {
  const text = node.nodeValue ?? ''
  if (!text) return []

  const range = document.createRange()
  let lastRect: DOMRect | null = null

  const entries: { i: number; size: number; rect: DOMRect }[] = []
  let idx = 0
  while (idx < text.length) {
    const size = codePointSize(text, idx)
    range.setStart(node, idx)
    range.setEnd(node, idx + size)
    const rect = range.getBoundingClientRect()
    if (rect.height) {
      entries.push({ i: idx, size, rect })
    }
    idx += size
  }

  return entries.reduce<TextNodeLine[]>((lines, { i, size, rect }) => {
    if (!lastRect || Math.abs(lastRect.bottom - rect.bottom) >= rect.height / 2) {
      lines.push({ start: i, end: i + size, rect })
    } else {
      lines[lines.length - 1].end = i + size
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
const isWordSeparator = (char: string): boolean => WORD_SEPARATOR_REGEX.test(char)

/**
 * Finds word boundaries around a given offset.
 * Returns the start and end indices of the word containing the offset.
 * A word is delimited by whitespace or hyphens.
 */
const findWordBoundaries = (text: string, offset: number): { start: number; end: number } | null => {
  if (offset < 0 || offset > text.length || text.length === 0) {
    return null
  }

  let checkIndex = offset === text.length ? offset - 1 : offset
  // Snap to code point boundary
  if (isLowSurrogate(text, checkIndex)) checkIndex--

  const checkSize = codePointSize(text, checkIndex)
  if (checkIndex >= 0 && checkIndex < text.length && isWordSeparator(text.slice(checkIndex, checkIndex + checkSize))) {
    return null
  }

  let start = checkIndex
  while (start > 0) {
    const prev = isLowSurrogate(text, start - 1) ? start - 2 : start - 1
    if (prev < 0 || isWordSeparator(text.slice(prev, prev + codePointSize(text, prev)))) break
    start = prev
  }

  let end = checkIndex + checkSize
  while (end < text.length) {
    const size = codePointSize(text, end)
    if (isWordSeparator(text.slice(end, end + size))) break
    end += size
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
  const text = node.nodeValue ?? ''
  while (lo < hi) {
    let mid = (lo + hi) >> 1
    // Snap mid to a code point boundary (don't split surrogate pairs)
    if (isLowSurrogate(text, mid)) mid--

    const size = codePointSize(text, mid)

    const r = document.createRange()
    r.setStart(node, mid)
    r.setEnd(node, Math.min(mid + size, hi))

    const rect = r.getBoundingClientRect()

    if (clientX < rect.left) {
      hi = mid
    } else if (clientX > rect.right) {
      lo = mid + size
    } else {
      const center = rect.left + rect.width / 2
      return clientX < center ? mid : Math.min(mid + size, hi)
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
  const isWhitespace = (char: string) => WHITESPACE_REGEX.test(char)

  if (isWhitespace(lineText[offsetInLine])) {
    // Find last non-whitespace character before the offset
    let lastNonWsEnd = -1
    let i = 0
    while (i < offsetInLine) {
      const size = codePointSize(lineText, i)
      if (!isWhitespace(lineText[i])) {
        lastNonWsEnd = i + size
      }
      i += size
    }

    // If found, place after it; otherwise place at start of line
    return lastNonWsEnd >= 0 ? lineStart + lastNonWsEnd : lineStart
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
    let lo = Math.max(lineStart, offset - 2)
    const hi = Math.min(lineEnd, offset + 2)
    // Snap lo to a code point boundary
    if (isLowSurrogate(text, lo)) lo = Math.max(lineStart, lo - 1)
    const r = document.createRange()
    let bestOffset = offset
    let bestDist = Infinity
    for (let i = lo; i <= hi; i++) {
      // Skip low surrogates (not valid caret positions)
      if (isLowSurrogate(text, i)) continue
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
const isWithinVoidArea = (node: Text, clientX: number, clientY: number): boolean => {
  const text = node.nodeValue ?? ''
  if (!text.trim()) return true // ignore pure whitespace nodes

  const range = document.createRange()

  for (let i = 0; i < text.length; i += codePointSize(text, i)) {
    const size = codePointSize(text, i)
    // Skip whitespace characters early
    if (WHITESPACE_REGEX.test(text[i])) continue

    range.setStart(node, i)
    range.setEnd(node, i + size)

    const rects = Array.from(range.getClientRects())

    for (const rect of rects) {
      if (rect.height === 0 || rect.width === 0) continue

      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return false
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
      return false
    }
  }

  return true
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

  for (let i = 0; i < text.length; i += codePointSize(text, i)) {
    const size = codePointSize(text, i)
    if (WHITESPACE_REGEX.test(text[i])) continue

    range.setStart(node, i)
    range.setEnd(node, i + size)

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
const findNearestTextNode = (textNodes: Text[], clientX: number, clientY: number): Text | null => {
  const nodesWithinCharBounds = textNodes.filter(node => !isWithinVoidArea(node, clientX, clientY))

  if (nodesWithinCharBounds.length > 0) {
    const node = nodesWithinCharBounds[0]
    const range = document.createRange()
    range.selectNodeContents(node)
    return node
  }

  return (
    textNodes.reduce<{ result: TextNodeWithRect; dist: number } | null>((closest, node) => {
      const { dist, rect } = getDistanceToNearestCharacter(node, clientX, clientY)
      return !closest || dist < closest.dist ? { result: { node, rect }, dist } : closest
    }, null)?.result.node ?? null
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

  const offsetInNode = calculateOffset(nearest, clientX, clientY)
  return {
    inVoidArea: isWithinVoidArea(nearest, clientX, clientY),
    offset: domPositionToUnformattedOffset(editable, nearest, offsetInNode),
  }
}

export default getCaretOffset
