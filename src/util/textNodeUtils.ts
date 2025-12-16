/** Represents a line within a text node with its character range and bounding box. */
export interface TextNodeLine {
  start: number
  end: number
  rect: DOMRect
}

/** Represents a text node with its bounding rectangle. */
interface TextNodeWithRect {
  node: Text
  rect: DOMRect
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

const textNodeUtils = {
  getTextNodes,
  findNearestTextNode,
  getTextNodeLines,
}

export default textNodeUtils
