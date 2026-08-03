/** Copies the source element's attributes onto the target element. Every existing attribute is removed first and the
 * source's are then set in order, so that the target serializes identically to the source (attribute order is
 * serialization order). */
const syncAttributes = (target: Element, source: Element) => {
  for (const name of Array.from(target.getAttributeNames())) {
    target.removeAttribute(name)
  }
  for (const name of source.getAttributeNames()) {
    target.setAttribute(name, source.getAttribute(name) ?? '')
  }
}

/** Returns true if the two nodes describe the same element type and can therefore be reconciled in place rather than
 * replaced. */
const isSameElement = (a: Node, b: Node): boolean =>
  a.nodeType === Node.ELEMENT_NODE &&
  b.nodeType === Node.ELEMENT_NODE &&
  (a as Element).tagName === (b as Element).tagName

/** Reconciles the target node's children with the source node's children, reusing existing nodes wherever they match. */
const morphChildren = (target: Node, source: Node) => {
  let sourceChild = source.firstChild
  let targetChild = target.firstChild

  while (sourceChild) {
    const nextSource = sourceChild.nextSibling

    // no target node left to reuse: adopt the remaining source nodes
    if (!targetChild) {
      target.appendChild(sourceChild.cloneNode(true))
      sourceChild = nextSource
      continue
    }

    const sourceText = sourceChild.textContent ?? ''
    const targetText = targetChild.textContent ?? ''

    if (sourceChild.nodeType === Node.TEXT_NODE && targetChild.nodeType === Node.TEXT_NODE) {
      // reuse the text node, splitting off any surplus text so it can be matched by the next source node
      const text = targetChild as Text
      if (targetText !== sourceText) {
        if (targetText.startsWith(sourceText) && sourceText.length > 0) {
          text.splitText(sourceText.length)
        } else {
          text.data = sourceText
        }
      }
      targetChild = targetChild.nextSibling
    } else if (isSameElement(sourceChild, targetChild)) {
      // reuse the element: re-sync its attributes and recurse into its children
      syncAttributes(targetChild as Element, sourceChild as Element)
      morphChildren(targetChild, sourceChild)
      targetChild = targetChild.nextSibling
    } else if (
      sourceChild.nodeType === Node.ELEMENT_NODE &&
      targetChild.nodeType === Node.TEXT_NODE &&
      sourceText.length > 0 &&
      targetText.startsWith(sourceText)
    ) {
      // the source wraps text that the target holds unwrapped: move the existing text node into a new wrapper rather
      // than re-creating it, so a selection anchored in it survives
      if (targetText !== sourceText) (targetChild as Text).splitText(sourceText.length)
      const wrapper = sourceChild.cloneNode(false) as Element
      const next = targetChild.nextSibling
      target.insertBefore(wrapper, targetChild)
      wrapper.appendChild(targetChild)
      morphChildren(wrapper, sourceChild)
      targetChild = next
    } else {
      // nothing to reuse: replace the target node outright
      const next = targetChild.nextSibling
      target.replaceChild(sourceChild.cloneNode(true), targetChild)
      targetChild = next
    }

    sourceChild = nextSource
  }

  // remove any target nodes the source no longer has
  while (targetChild) {
    const next = targetChild.nextSibling
    target.removeChild(targetChild)
    targetChild = next
  }
}

/**
 * Updates an element's contents to the given HTML in place, reusing the existing DOM nodes wherever they match the new
 * HTML instead of replacing them wholesale as an innerHTML assignment does.
 *
 * Node identity is what the browser's selection is anchored to: assigning innerHTML destroys every node and with it the
 * native text selection (on Android, the selection handles and context menu are lost even when the range is
 * re-created programmatically). Applying a formatting change through this function leaves the selected text nodes
 * untouched, so the selection is never interrupted (#4275).
 *
 * Reconciliation is best-effort: markup it cannot match up is replaced outright, exactly as an innerHTML assignment
 * would. ContentEditable compares the resulting markup against the value it is rendering and falls back to a wholesale
 * assignment if the two diverge, so the element always ends up with the intended markup either way.
 */
const morphHtml = (element: HTMLElement, html: string): void => {
  const source = document.createElement('div')
  source.innerHTML = html
  morphChildren(element, source)
}

export default morphHtml
