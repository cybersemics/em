import { ALLOWED_FORMATTING_TAGS } from '../constants'
import splitHtmlAtTextOffset from './splitHtmlAtTextOffset'
import trimHtml from './trimHtml'

/** Returns true if two nodes are elements with the same tag name and identical attributes. */
const isMatchingElement = (a: ChildNode, b: ChildNode): boolean => {
  if (a.nodeType !== Node.ELEMENT_NODE || b.nodeType !== Node.ELEMENT_NODE) return false

  const elementA = a as HTMLElement
  const elementB = b as HTMLElement
  if (elementA.tagName !== elementB.tagName || elementA.attributes.length !== elementB.attributes.length) return false

  return Array.from(elementA.attributes).every(attribute => elementB.getAttribute(attribute.name) === attribute.value)
}

/** Recursively merges a node's adjacent children that have the same tag name and attributes. */
const mergeChildren = (parent: ChildNode): void => {
  let child = parent.firstChild

  while (child) {
    const next = child.nextSibling

    // move the next sibling's children into the current child, then re-check the current child against its new next sibling
    if (next && isMatchingElement(child, next)) {
      while (next.firstChild) child.appendChild(next.firstChild)
      next.remove()
      continue
    }

    mergeChildren(child)
    child = child.nextSibling
  }

  // merge adjacent text nodes
  parent.normalize()
}

/**
 * Merges adjacent tags that have the same tag name and attributes, e.g. `<b>Lorem </b><b>ipsum</b>` -> `<b>Lorem ipsum</b>`. Prevents duplicate formatting tags when HTML fragments are concatenated.
 *
 * @param htmlValue The source HTML.
 */
const mergeAdjacentTags = (htmlValue: string): string => {
  const div = document.createElement('div')
  div.innerHTML = htmlValue

  // Drop the tags the split emptied, e.g. the <b> left behind when the selection ends exactly at </b>. Removing them
  // first lets the tags they separated merge.
  for (const element of Array.from(div.querySelectorAll(ALLOWED_FORMATTING_TAGS.join(',')))) {
    if (element.textContent === '') element.remove()
  }

  mergeChildren(div)
  return div.innerHTML
}

/**
 * Splits a formatted value into the value with the selection removed and the extracted selection, with formatting tags
 * re-balanced onto each part. A formatted value cannot be sliced by the selection offsets, since they are plain text
 * offsets that do not line up with the indices of the markup, causing the slice to land in the middle of a tag (#4103).
 *
 * @param value The source HTML.
 * @param selectionStart The plain text offset of the start of the selection.
 * @param selectionEnd The plain text offset of the end of the selection.
 */
const splitFormattedValue = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { remainingValue: string; extractedValue: string } => {
  // Split at the end offset first so that the left half can then be split at the start offset. The right half of a split cannot be re-split at the end offset, since its text offsets are relative to itself, not to the original value.
  const endSplit = splitHtmlAtTextOffset(value, selectionEnd)
  return {
    // merge the formatting tags that end up adjacent when the two halves are re-joined, e.g. <b>Lorem </b><b>dolor</b>
    remainingValue: trimHtml(
      mergeAdjacentTags(`${splitHtmlAtTextOffset(value, selectionStart).left}${endSplit.right}`),
    ),
    extractedValue: trimHtml(splitHtmlAtTextOffset(endSplit.left, selectionStart).right),
  }
}

export default splitFormattedValue
