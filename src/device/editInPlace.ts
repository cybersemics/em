/* eslint-disable import/prefer-default-export */
/**
 * Rewrites a thought's editable to new HTML through DOM mutations alone, so that the browser selection over it is never
 * torn down. Android's WebView dismisses its native selection menu (Cut, Copy, Paste) and the selection handles as
 * soon as the selection collapses or is set through the Selection API, and setting it again does not bring them
 * back (#5641). Assigning innerHTML collapses the selection, so em's own edits of the selected text go through here
 * first, and fall back to innerHTML and selection.setRange only when the edit cannot be made this way.
 *
 * The DOM carries a selection through a mutation by moving its boundaries by rule: inserting or deleting characters
 * shifts the offsets after them, and splitting a text node moves the boundaries after the split into the new node.
 * None of this is a change of selection as far as Android is concerned. Each boundary is kept in a text node, since
 * Android's WebView does not shift a boundary between two children of an element when a node is inserted before it.
 * See docs/cursor-and-caret.md.
 */
import * as selection from './selection'

/** Returns the non-empty text nodes under a node in document order, leaving empty selection boundaries in place. */
const textNodes = (root: Node): Text[] => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  return nodes.filter(node => node.length > 0)
}

/** Moves nodes into a new fragment, so that they can be inserted in one mutation. */
const nodesToFragment = (nodes: Node[]): DocumentFragment => {
  const fragment = document.createDocumentFragment()
  fragment.append(...nodes)
  return fragment
}

/** Parses HTML into a fragment, or returns null if the fragment does not serialize back to the same HTML, in which case
 * the editable could not end up with exactly that HTML either. ContentEditable re-renders an editable whose live
 * innerHTML differs from its value, which would tear down the selection anyway. */
const parse = (html: string): DocumentFragment | null => {
  const template = document.createElement('template')
  template.innerHTML = html
  return template.innerHTML === html ? template.content : null
}

/** Changes an editable to the given HTML by changing its existing text nodes character by character. Replacing a
 * character with insertData followed by deleteData leaves every boundary of a live range where it was, whereas
 * assigning a text node's data collapses it. Only possible when the new HTML differs from the editable's only in
 * characters, with the same markup. A length-changing edit inserts the changed span before deleting its old text,
 * carrying selection boundaries around that span to their new offsets. Returns false, without changing anything,
 * when the markup differs or a selection boundary cuts through a length-changing replacement. */
export const replaceTextInPlace = (editable: HTMLElement, html: string): boolean => {
  const fragment = parse(html)
  if (!fragment) return false
  const newNodes = textNodes(fragment)
  const liveNodes = textNodes(editable)
  if (liveNodes.length !== newNodes.length) return false

  const clone = editable.cloneNode(true) as HTMLElement
  textNodes(clone).forEach((node, i) => (node.data = newNodes[i].data))
  if (clone.innerHTML !== html) return false

  const boundaries = selection.boundaries()
  const replacements = liveNodes.map((node, i) => {
    const data = newNodes[i].data
    if (node.length === data.length) return null

    let start = 0
    while (start < Math.min(node.length, data.length) && node.data[start] === data[start]) start++
    let suffix = 0
    while (
      suffix < Math.min(node.length, data.length) - start &&
      node.data[node.length - suffix - 1] === data[data.length - suffix - 1]
    ) {
      suffix++
    }
    return { start, end: node.length - suffix, data: data.slice(start, data.length - suffix) }
  })

  // A boundary inside the replaced span needs the caller's offset-aware restore. Preflight every node before editing.
  if (
    boundaries &&
    liveNodes.some((node, i) => {
      const replacement = replacements[i]
      return (
        replacement &&
        ((boundaries.startContainer === node &&
          boundaries.startOffset > replacement.start &&
          boundaries.startOffset < replacement.end) ||
          (boundaries.endContainer === node &&
            boundaries.endOffset > replacement.start &&
            boundaries.endOffset < replacement.end))
      )
    })
  ) {
    return false
  }

  liveNodes.forEach((node, i) => {
    const replacement = replacements[i]
    if (replacement) {
      node.insertData(replacement.start, replacement.data)
      node.deleteData(replacement.start + replacement.data.length, replacement.end - replacement.start)
      return
    }
    const newData = newNodes[i].data
    Array.from({ length: newData.length }, (_, offset) => offset)
      .filter(offset => node.data[offset] !== newData[offset])
      .forEach(offset => {
        node.insertData(offset, newData[offset])
        node.deleteData(offset + 1, 1)
      })
  })

  return true
}

/** Returns the index among the parent's children at which the given plain-text offset falls, splitting a text node that
 * spans it. Returns null if an element spans it, since the offset then has no place between two children. */
const childIndexAtOffset = (parent: Node, offset: number): number | null => {
  const children = Array.from(parent.childNodes)
  let remaining = offset
  for (let i = 0; i < children.length; i++) {
    if (remaining === 0) return i
    const node = children[i]
    const length = node.textContent?.length ?? 0
    if (remaining < length) {
      if (!(node instanceof Text)) return null
      node.splitText(remaining)
      return i + 1
    }
    remaining -= length
  }
  return remaining === 0 ? children.length : null
}

/**
 * Changes an editable to the given HTML, which is its own content with different formatting over the selected
 * plain-text range, such as a Bold or a text color applied to it. The selected text's new markup is inserted between
 * the selection's own boundaries and the old text removed around it, so that the selection ends up over the new markup
 * without ever being set. Only possible when both boundaries are in the editable's own text nodes, and the new HTML has
 * no element spanning the start or the end of the range. Returns false, without changing the editable's HTML,
 * otherwise, e.g. when the selected word is the whole content of a <b> and its Bold is toggled off, since the selection
 * cannot leave an element that is removed without collapsing.
 *
 * Each boundary stays in its own text node throughout, which is emptied rather than removed and then sits next to the
 * new markup. An empty text node adds nothing to innerHTML. Android's WebView does not move a boundary between two
 * children of an element when a node is inserted before it, so a boundary that has been handed to the editable by a
 * removed text node would end up in the wrong place as soon as anything is inserted before it.
 *
 * @param range The plain-text range [start, end) of the selection, from selection.offsetRange.
 */
export const replaceMarkupInPlace = (
  editable: HTMLElement,
  html: string,
  range: { start: number; end: number },
): boolean => {
  const fragment = parse(html)
  const before = selection.boundaries()
  if (
    !fragment ||
    !before ||
    range.end <= range.start ||
    !(before.startContainer instanceof Text && before.startContainer.parentNode === editable) ||
    !(before.endContainer instanceof Text && before.endContainer.parentNode === editable)
  ) {
    return false
  }

  // Split the new content where the selection starts and then where it ends, and stop if an element spans either
  // point. The start goes first, since splitting at the end never moves a child before it.
  const newStart = childIndexAtOffset(fragment, range.start)
  const newEnd = newStart !== null ? childIndexAtOffset(fragment, range.end) : null
  if (newStart === null || newEnd === null) return false
  const newNodes = Array.from(fragment.childNodes)

  // Split the live text nodes at the selection's boundaries, which leaves each boundary at the end of the first half.
  // The end goes first, since splitting at the start moves an end in the same text node into the second half.
  before.endContainer.splitText(before.endOffset)
  const endSplit = selection.boundaries()!
  ;(endSplit.startContainer as Text).splitText(endSplit.startOffset)
  const split = selection.boundaries()!
  const startNode = split.startContainer
  const endNode = split.endContainer

  // Splitting a text node changes nothing in innerHTML, so it is still safe to stop if the browser did not leave the
  // boundaries at the ends of two of the editable's text nodes.
  const liveNodes = Array.from(editable.childNodes)
  const startIndex = liveNodes.indexOf(startNode as ChildNode)
  const endIndex = liveNodes.indexOf(endNode as ChildNode)
  if (
    !(startNode instanceof Text && endNode instanceof Text) ||
    startIndex === -1 ||
    endIndex <= startIndex ||
    split.startOffset !== startNode.length ||
    split.endOffset !== endNode.length
  ) {
    return false
  }

  // Insert all of the new content around the boundaries first, so that nothing is inserted before a boundary that has
  // moved, then remove the old content that no boundary is in.
  editable.insertBefore(nodesToFragment(newNodes.slice(0, newStart)), editable.firstChild)
  startNode.after(nodesToFragment(newNodes.slice(newStart, newEnd)))
  editable.append(nodesToFragment(newNodes.slice(newEnd)))
  liveNodes.filter((_, i) => i !== startIndex && i !== endIndex).forEach(node => node.remove())

  // Empty the two text nodes that hold the boundaries. The start's text is all before the selection and the end's is
  // all inside it, so each boundary moves to the start of its now empty text node, on either side of the new markup.
  startNode.deleteData(0, startNode.length)
  endNode.deleteData(0, endNode.length)

  return true
}
