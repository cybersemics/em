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
import editableSyncStore from '../stores/editableSyncStore'
import { FormatCommand } from '../util/formatSelectionHtml'
import * as selection from './selection'

/** The document.execCommand names of the formatting commands that the browser can toggle itself. */
const EXEC_COMMAND_NAMES: Partial<Record<FormatCommand, string>> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strikethrough: 'strikeThrough',
}

/** Returns the text nodes under a node in document order. */
const textNodes = (root: Node): Text[] => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  return nodes
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

/** Returns the length of the longest common prefix of two strings. */
const commonPrefixLength = (a: string, b: string): number => {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

/** Returns the length of the longest common suffix of two strings that does not overlap the given prefix length. */
const commonSuffixLength = (a: string, b: string, prefix: number): number => {
  let i = 0
  while (i < a.length - prefix && i < b.length - prefix && a[a.length - 1 - i] === b[b.length - 1 - i]) i++
  return i
}

/** Changes a text node to new data, keeping every boundary of the live selection where it belongs. Assigning a text
 * node's data collapses the selection, whereas inserting and deleting characters moves its boundaries by rule. When
 * the length is unchanged, each changed character is replaced with insertData followed by deleteData, which leaves
 * every boundary where it was. Otherwise, the run of characters between the common prefix and suffix is replaced in one
 * insertData and one deleteData, which keeps a boundary on either edge of that run on the same edge of the new run,
 * e.g. around 'straße' when it becomes 'STRASSE'. */
const replaceData = (node: Text, newData: string): void => {
  if (node.length === newData.length) {
    Array.from({ length: newData.length }, (_, offset) => offset)
      .filter(offset => node.data[offset] !== newData[offset])
      .forEach(offset => {
        node.insertData(offset, newData[offset])
        node.deleteData(offset + 1, 1)
      })
    return
  }

  const prefix = commonPrefixLength(node.data, newData)
  const suffix = commonSuffixLength(node.data, newData, prefix)
  const oldLength = node.length - prefix - suffix
  const newRun = newData.slice(prefix, newData.length - suffix)
  node.insertData(prefix, newRun)
  node.deleteData(prefix + newRun.length, oldLength)
}

/** Returns true if a boundary of the selection falls strictly inside the run of characters of a text node that
 * replaceData would replace as a whole, where it would be moved to the end of the new run. */
const hasBoundaryInChangedRun = (node: Text, newData: string): boolean => {
  if (node.length === newData.length) return false
  const bounds = selection.boundaries()
  if (!bounds) return false
  const prefix = commonPrefixLength(node.data, newData)
  const runEnd = node.length - commonSuffixLength(node.data, newData, prefix)
  return [
    { container: bounds.startContainer, offset: bounds.startOffset },
    { container: bounds.endContainer, offset: bounds.endOffset },
  ].some(({ container, offset }) => container === node && offset > prefix && offset < runEnd)
}

/** Groups the non-empty text nodes under a node into runs of adjacent siblings, with only empty text nodes between
 * them. Parsing HTML merges each such run into a single text node. */
const textRuns = (root: Node): Text[][] =>
  textNodes(root)
    .filter(node => node.length > 0)
    .reduce<Text[][]>((runs, node) => {
      const run = runs[runs.length - 1]
      let sibling = node.previousSibling
      while (sibling instanceof Text && sibling.length === 0) sibling = sibling.previousSibling
      return run && sibling === run[run.length - 1] ? [...runs.slice(0, -1), [...run, node]] : [...runs, [node]]
    }, [])

/** Splits the new text of a run of adjacent text nodes into the new data of each node, or returns null if that cannot
 * be done without moving text from one node to another. A run of one node takes all of it. A longer run can only be
 * split when the length is unchanged, which a letter case change almost always leaves it, so that each node keeps its
 * own characters. */
const splitRun = (run: Text[], newText: string): string[] | null => {
  if (run.length === 1) return [newText]
  if (run.reduce((length, node) => length + node.length, 0) !== newText.length) return null
  return run.reduce<{ data: string[]; offset: number }>(
    ({ data, offset }, node) => ({
      data: [...data, newText.slice(offset, offset + node.length)],
      offset: offset + node.length,
    }),
    { data: [], offset: 0 },
  ).data
}

/** Pairs each non-empty text node under a node with its new data from the text nodes of the new HTML, or returns null
 * if they do not correspond (see splitRun). */
const textNodeUpdates = (root: Node, newNodes: Text[]): { node: Text; data: string }[] | null => {
  const runs = textRuns(root)
  if (runs.length !== newNodes.length) return null
  const split = runs.map((run, i) => splitRun(run, newNodes[i].data))
  return split.every(data => data !== null)
    ? runs.flatMap((run, i) => run.map((node, j) => ({ node, data: split[i]![j] })))
    : null
}

/** Changes an editable to the given HTML by changing the characters of its existing text nodes, which keeps the
 * selection over the same text (see replaceData). Only possible when the new HTML differs from the editable's only in
 * characters, with the same markup, which is what a letter case change produces, and when no boundary of the
 * selection falls inside a run of characters whose length changes. Empty text nodes, such as the ones
 * replaceMarkupInPlace leaves holding the selection's boundaries around new formatting, add nothing to the HTML and
 * are left as they are. So are the boundaries between adjacent text nodes, which a format toggled off by
 * replaceMarkupInPlace leaves around the word, though the new HTML has one text node there. Returns false, without
 * changing anything, otherwise. */
export const replaceTextInPlace = (editable: HTMLElement, html: string): boolean => {
  const fragment = parse(html)
  if (!fragment) return false
  const newNodes = textNodes(fragment)
  const updates = textNodeUpdates(editable, newNodes)
  if (!updates) return false

  const clone = editable.cloneNode(true) as HTMLElement
  textNodeUpdates(clone, newNodes)?.forEach(({ node, data }) => (node.data = data))
  if (clone.innerHTML !== html) return false

  if (updates.some(({ node, data }) => hasBoundaryInChangedRun(node, data))) return false

  updates.forEach(({ node, data }) => replaceData(node, data))

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

/**
 * Applies a formatting command to the selection with the browser's own editing command, document.execCommand, and
 * returns true if that left the editable with exactly the given HTML. The command removes a tag that holds both of the
 * selection's boundaries without tearing the selection down, which no DOM edit of em's own can do, so Android's WebView
 * keeps its selection menu and handles, e.g. when a double-tapped word that is already bold has its Bold toggled off.
 * Returns false, without changing anything, for a command the browser has no equivalent for, such as Code. Returns
 * false after changing the editable if the browser's markup differs from the given HTML, in which case the caller has
 * to write the HTML itself. The editable's change handler is suppressed, since the caller dispatches the edit.
 */
export const replaceMarkupWithCommand = (editable: HTMLElement, html: string, command: FormatCommand): boolean => {
  const execCommandName = EXEC_COMMAND_NAMES[command]
  if (!execCommandName) return false

  editableSyncStore.update({ suppressChange: true })
  document.execCommand(execCommandName)
  editableSyncStore.update({ suppressChange: false })

  return editable.innerHTML === html
}
