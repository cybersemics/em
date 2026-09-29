import { ALLOWED_FORMATTING_TAGS } from '../constants'

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

export default mergeAdjacentTags
