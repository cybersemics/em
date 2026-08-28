/* eslint-disable no-restricted-properties */
/** Wraps the browser Selection API in a device-agnostic interface. */
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { isHTMLElement } from 'motion/react'
import SplitResult from '../@types/SplitResult'
import { ALLOWED_FORMATTING_TAGS } from '../constants'

export type SelectionOptionsType = {
  offset?: number
  end?: boolean
}

/** A node and character offset. */
export interface NodeOffset {
  node: Node | null
  offset: number
}

/** A saved selection object that can restore the browser selection when passed to selection.restore. */
export interface SavedSelection {
  /** The focus end of the selection, i.e. the end that moves as the selection is extended. */
  node: Node
  offset: number
  /** The anchor end, i.e. the end that stays put. Only present when the saved selection was a range; a collapsed
   * caret has no second end to record. */
  anchor?: { node: Node; offset: number }
}

/** Gets the padding of an element as an array of numbers [top, right, bottom, left]. */
const getElementPaddings = (element: HTMLElement): [number, number, number, number] => {
  const paddings = window.getComputedStyle(element, null).getPropertyValue('padding').split('px').map(Number)
  return [0, 1, 2, 3].map(i => paddings[i] ?? paddings[i - 2] ?? 0) as [number, number, number, number]
}

/** Clears the selection. */
export const clear = (): void => {
  const focusNode = window.getSelection()?.focusNode

  // we need to blur the element otherwise onBlur is not called (#1466)
  // if the selection is on a text node, blur its parent
  const focusElement =
    focusNode?.nodeType === Node.ELEMENT_NODE
      ? (focusNode as HTMLElement)
      : focusNode?.parentNode?.nodeType === Node.ELEMENT_NODE
        ? (focusNode.parentNode as HTMLElement)
        : null
  if (focusElement) {
    focusElement.blur()
  }
  window.getSelection()?.removeAllRanges()

  // On mobile safari it is possible that the keyboard stays up even when there is no selection.
  // Blur the active document element to close the keyboard.
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }

  // On iOS Capacitor a DOM blur does not reliably dismiss the native WKWebView keyboard (Keyboard
  // resize is 'none'), so hide it explicitly via the Keyboard plugin.
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Keyboard')) {
    Keyboard.hide()
  }
}

/** Selects the entire contents of the given node. Used to stage rich content for a programmatic copy. */
export const selectNode = (node: Node): void => {
  const sel = window.getSelection()
  if (!sel) return
  const range = document.createRange()
  range.selectNodeContents(node)
  sel.removeAllRanges()
  sel.addRange(range)
}

/** Returns true if the selection is a collapsed caret, i.e. the beginning and end of the selection are the same. Returns undefined if there is no selection. */
export const isCollapsed = (): boolean => !!window.getSelection()?.isCollapsed

/** Returns true if there is an active selection. */
export const isActive = (): boolean => !!window.getSelection()?.focusNode

/** Traverses a node's parents until it finds an element node that is not a formatting tag. Returns null if a suitable parent cannot be found. */
const getEditableCandidate = (node?: EventTarget | null) => {
  if (!isHTMLElement(node)) return null
  let element = node

  // If the selected element is a formatting tag, then one of its parents may be the editable (#3805)
  while (
    element.parentElement &&
    (element.nodeType === Node.TEXT_NODE || ALLOWED_FORMATTING_TAGS.includes(element.tagName.toLocaleLowerCase()))
  )
    element = element.parentElement

  return element.nodeType === Node.ELEMENT_NODE ? element : null
}

/** Check the node, if it exists, for a data-editable attribute. */
const isContentEditable = (node: Element | null): boolean => node?.hasAttribute('data-editable') ?? false

/** Check the node, if it exists, for an ariaLabel set to note-editable. */
const isNoteEditable = (node: Element | null): boolean => node?.ariaLabel === 'note-editable'

/** Returns true if the node is part of a note. Defaults to using the active selection. */
export const isNote = (node?: EventTarget | null): boolean => {
  const editable = node === undefined ? document.activeElement : getEditableCandidate(node)
  return isNoteEditable(editable)
}
/** Returns true if the node is part of a thought. Defaults to using the active selection. */
// We should see if it is possible to just use state.isKeyboardOpen and selection.isActive()
export const isThought = (node?: EventTarget | null): boolean => {
  const editable = node === undefined ? document.activeElement : getEditableCandidate(node)
  return isContentEditable(editable) || isNoteEditable(editable)
}

/** Returns true if the selection is  on the first line of a multi-line text node. Returns true if there is no selection or if the text node is only a single line. */
export const isOnFirstLine = (): boolean => {
  const selection = window.getSelection()
  if (!selection) return true

  const { anchorNode: baseNode, rangeCount } = selection
  if (rangeCount === 0) return true

  const clientRects = selection.getRangeAt(0).getClientRects()
  if (!clientRects?.length) return true

  const { y: rangeY } = clientRects[clientRects.length - 1]
  if (!rangeY) return true

  const baseNodeParentEl = baseNode?.parentElement as HTMLElement
  if (!baseNodeParentEl) return true

  const { y: baseNodeY } = baseNodeParentEl.getClientRects()[0]
  const [paddingTop] = getElementPaddings(baseNodeParentEl)
  // assume font size is in px
  const fontSize = parseInt(window.getComputedStyle(baseNodeParentEl, null).fontSize)

  // allow error of 10px
  return Math.abs(rangeY - baseNodeY - paddingTop - fontSize / 3) < 10
}

/** Returns true if the selection is on the last line of a thought. Returns true if there is no selection or if the text is a single line. */
export const isOnLastLine = (): boolean => {
  const selection = window.getSelection()
  if (!selection) return true

  const { anchorNode: baseNode, rangeCount } = selection
  if (rangeCount === 0) return true

  const clientRects = selection.getRangeAt(0).getClientRects()
  if (!clientRects?.length) return true

  const { y: rangeY, height: rangeHeight } = clientRects[0]
  if (!rangeY) return true

  const baseNodeParentEl = baseNode?.parentElement as HTMLElement
  if (!baseNodeParentEl) return true

  // baseNodeParentEl is the thought for plain text, but formatted text requires traversing up
  const thought = ((baseNodeParentEl as HTMLElement).closest?.('[data-editable]') as HTMLElement) || baseNodeParentEl
  const { y: baseNodeY, height: baseNodeHeight } = thought.getClientRects()[0]
  const [paddingTop, , paddingBottom] = getElementPaddings(thought)

  // assume font size is in px
  const fontSize = parseInt(window.getComputedStyle(thought, null).fontSize)
  const isMultiline = Math.abs(rangeY - baseNodeY - paddingTop - fontSize) > 2
  if (!isMultiline) return true

  // allow error of 90% fontSize
  return rangeY + rangeHeight > baseNodeY + baseNodeHeight - paddingTop - paddingBottom - fontSize * 0.9
}

/** Returns true if the browser selection is on a text node. */
export const isText = (): boolean => window.getSelection()?.focusNode?.nodeType === Node.TEXT_NODE

/** Returns true if the browser selection is inside the editable for a thought. */
export const isOnEditable = (thoughtId: string): boolean => {
  const focusNode = window.getSelection()?.focusNode
  const focusElement =
    focusNode instanceof Element ? focusNode : focusNode?.parentNode instanceof Element ? focusNode.parentNode : null

  return focusElement?.closest('[data-editable]')?.getAttribute('aria-label') === `editable-${thoughtId}`
}

/** Returns true if the browser selection is on an element node and focus offset is 0.
 * This represents a case where the browser will render the caret at the start of the text node's content.
 */
export const isStartOfElementNode = (): boolean => {
  const selection = window.getSelection()
  return !isText() && !!selection && selection.focusOffset === 0
}

/** Returns true if the browser selection is on an element node and focus offset is 1.
 * This represents a case where the browser will render the caret at the end of the text node's content.
 */
export const isEndOfElementNode = (): boolean => {
  const selection = window.getSelection()
  return !isText() && !!selection && selection.focusOffset === 1
}

/** Returns the character offset of the active selection. */
// TODO: The browser selection offset has different semantics when the selection is on a text node vs an element node. Unfortunately this function has been used indiscriminately for both cases. We should clean this up and only use the function on text nodes.
export const offset = (): number | null => window.getSelection()?.focusOffset ?? null

/** Returns the character offset of the selection's anchor (the fixed end of a range; `offset` returns the focus/moving end). */
export const anchorOffset = (): number | null => window.getSelection()?.anchorOffset ?? null

/** Returns the character offset within a thought, taking into account siblings and intervening ancestor elements.
 *
 * @example <div>Hello <b>wo|rld</b></div> // returns offset 8
 */
export const offsetThought = (): number | null => {
  const selection = window.getSelection()
  if (!selection?.focusNode) return null

  let total =
    selection.focusNode.nodeType === Node.ELEMENT_NODE
      ? selection.focusOffset
        ? selection.focusNode.textContent?.length || 0
        : 0
      : selection.focusOffset
  let curNode: Node | null = selection.focusNode.nodeType === Node.TEXT_NODE ? selection.focusNode : selection.focusNode
  while (curNode && !(curNode as HTMLElement)?.hasAttribute?.('data-editable')) {
    if (curNode?.previousSibling) {
      total += curNode.previousSibling.textContent?.length || 0
      curNode = curNode.previousSibling
    } else {
      curNode = curNode?.parentElement || null
    }
  }

  return total
}

/** Returns the plain-text character offset of the selection's focus relative to the given root node, ignoring nested HTML markup. Returns null if there is no selection or the focus is not within the node. */
export const offsetFromNode = (node: Node): number | null => {
  const selection = window.getSelection()
  if (!selection?.focusNode || !node.contains(selection.focusNode)) return null
  const range = document.createRange()
  range.selectNodeContents(node)
  range.setEnd(selection.focusNode, selection.focusOffset)
  return range.toString().length
}

/** Returns the character offset at the end of the selection. Returns null if there is no selection.
 *
 * The offset is relative to the node the selection starts in, so it only matches the thought's plain-text offset when
 * the value has a single text node. Prefer offsetRange or offsetRangeThought. See #5154.
 */
export const offsetEnd = (): number | null => {
  const selection = window.getSelection()
  if (!selection) return null
  const range = selection.getRangeAt(0)
  if (!range) return null
  const selectionStart = range.startOffset || 0
  return selectionStart + selection.toString().length
}

/** Returns the character offset at the start of the selection. Returns null if there is no selection.
 *
 * The offset is relative to the node the selection starts in, so it only matches the thought's plain-text offset when
 * the value has a single text node. Prefer offsetRange or offsetRangeThought. See #5154.
 */
export const offsetStart = (): number | null => {
  const selection = window.getSelection()
  if (!selection) return null
  const range = selection.getRangeAt(0)
  if (!range) return null
  return range.startOffset || 0
}

/** Returns the plain-text character offsets [start, end) of the current selection relative to the given editable
 * element (ignoring nested HTML), or null if there is no selection within it. Used to apply formatting to an
 * arbitrary sub-range synchronously (#4637). */
export const offsetRange = (editable: HTMLElement): { start: number; end: number } | null => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!editable.contains(range.commonAncestorContainer)) return null
  const pre = range.cloneRange()
  pre.selectNodeContents(editable)
  pre.setEnd(range.startContainer, range.startOffset)
  const start = pre.toString().length
  return { start, end: start + range.toString().length }
}

/** Returns the plain-text character offsets [start, end) of the current selection relative to the given thought's
 * editable, or null if the thought is not rendered or the selection is not within it. */
export const offsetRangeThought = (thoughtId: string): { start: number; end: number } | null => {
  const editable = document.querySelector(`[aria-label="editable-${thoughtId}"]`)
  return editable ? offsetRange(editable as HTMLElement) : null
}

/** Clamps a saved offset to what the node can currently address. The node's contents may have changed while the
 * selection was saved, and an out-of-bounds offset makes the Selection API throw. */
const validOffset = (node: Node, offset: number): number =>
  // If it's an element node, ensure offset doesn't exceed number of children
  node.nodeType === Node.ELEMENT_NODE
    ? Math.min(offset, node.childNodes.length)
    : // If it's a text node, ensure offset doesn't exceed text length
      node.nodeType === Node.TEXT_NODE && node.textContent
      ? Math.min(offset, node.textContent.length)
      : // Default to 0 if we can't determine a valid offset
        0

/** Restores the selection with the given restoration object (returned by selection.save). NOOP if the restoration object is null or undefined. */
export const restore = (savedSelection: SavedSelection | null): void => {
  if (!savedSelection) return

  const sel = window.getSelection()
  if (!sel) return

  sel.removeAllRanges()

  const { node, anchor } = savedSelection
  const offset = validOffset(node, savedSelection.offset)

  // Restore both ends when a range was saved. Collapsing to the focus end instead would silently downgrade the user's
  // selection to a caret, which matters wherever the selection is hijacked and handed back: the Command Universe
  // takes focus for its search input, and copy stages rich content in a hidden contenteditable.
  if (anchor) {
    sel.setBaseAndExtent(anchor.node, validOffset(anchor.node, anchor.offset), node, offset)
  } else {
    sel.collapse(node, offset)
  }
}

/** Returns an object representing the current selection that can be passed to selection.restore to restore the selection. */
export const save = (): SavedSelection | null => {
  const sel = window.getSelection()

  if (sel && sel.rangeCount > 0 && sel.focusNode) {
    return {
      node: sel.focusNode,
      offset: sel.focusOffset,
      // A collapsed selection's anchor is its focus, so recording it would be redundant.
      ...(!sel.isCollapsed && sel.anchorNode ? { anchor: { node: sel.anchorNode, offset: sel.anchorOffset } } : null),
    }
  } else {
    return null
  }
}

/**
 * Recursively iterates the nodes children and returns focusNode and offset where the relative offset ends.
 */
const offsetFromClosestParentRecursive = (node: Node, relativeOffset: number): NodeOffset | null => {
  if (!node.hasChildNodes()) return null

  const childNodesArray = Array.from(node.childNodes)

  // find the index of the node where the length of the text content is greater or equal to the given relative offset
  const possibleFocusNodeIndex = childNodesArray.findIndex((_, i) => {
    const lenghtOfTextContent = childNodesArray
      .slice(0, i + 1)
      .reduce((acc, node) => acc + (node.textContent?.length ?? 0), 0)
    return lenghtOfTextContent >= relativeOffset
  })

  if (possibleFocusNodeIndex < 0) return null

  const possibleFocusNode = childNodesArray[possibleFocusNodeIndex]

  const isTextNode = possibleFocusNode.nodeType === Node.TEXT_NODE
  const textCountBeforeThisNode = childNodesArray
    .slice(0, possibleFocusNodeIndex)
    .reduce((acc, node) => acc + (node.textContent?.length ?? 0), 0)

  // Note: A possible focus node can itself be a focus node only if it is of type #text. Else focus node should be one of it's descendant text node.
  if (isTextNode) {
    return {
      node: possibleFocusNode,
      // the actual offset should always be taken relative to the focus node.
      offset: relativeOffset - textCountBeforeThisNode,
    }
  }

  const remainingrelativeOffset = relativeOffset - textCountBeforeThisNode

  return offsetFromClosestParentRecursive(possibleFocusNode, remainingrelativeOffset)
}

/**
 * Takes a root node and a plain text offset relative to that node. Finds the node at that offset and returns an offset relative to its closest parent.
 *
 * @param nodeOffset - The offset that is taken relative to the value with all the html tags removed.
 */
export const offsetFromClosestParent = (nodeRoot: Node, offsetRoot: number): NodeOffset | null => {
  // case where caret should be positioned at the beginning of the node.
  if (offsetRoot <= 0) return { node: nodeRoot, offset: 0 }
  // case where the caret should be positioned at the end of the node.
  else if (nodeRoot.textContent && offsetRoot >= nodeRoot.textContent.length) {
    return {
      node: nodeRoot,
      offset: nodeRoot.childNodes.length,
    }
  }

  return offsetFromClosestParentRecursive(nodeRoot, offsetRoot)
}

/** Set the selection at the desired offset on the given node. Inserts empty text node when element has no children.
 * NOTE: asyncFocus() needs to be called on mobile before set and before any asynchronous effects that call set.
 *
  @param node      The node to set the selection on.
  @param offset    Character offset of the selection relative to the plain text content, i.e. ignoring nested HTML.
  @param end       If true, sets the offset to the end of the text.
 */
export const set = (
  node: Node | null,
  { offset = 0, end = false }: SelectionOptionsType = { offset: 0, end: false },
): void => {
  if (!node) return

  // if a numeric offset is given, convert the outer offset (relative to the thought) to the inner offset (relative to the nearest ancestor of the new selection) which is expected by Range
  // this handles nested HTML elements such as <b> or <i>.
  const nodeOffset = offset != null ? offsetFromClosestParent(node, offset) : null
  const focusNode = nodeOffset?.node ?? node

  /** Returns end offset based on the type of node. */
  const getEndOffset = () => {
    const isTextNode = focusNode.nodeType === Node.TEXT_NODE
    return isTextNode ? (focusNode.textContent?.length ?? 0) : focusNode.childNodes.length
  }

  const range = document.createRange()
  const sel = window.getSelection() || new Selection()

  // Commenting this as of now because the addition of this logic is unknown.

  // bail if already selected
  // compare closest element node, since there is no need to update the selection if it is on either the text node or element node
  // const focusElementNew = focusNode.nodeType === Node.TEXT_NODE ? focusNode.parentElement : focusNode
  // const focusElementOld = sel.focusNode?.nodeType === Node.TEXT_NODE ? sel.focusNode.parentElement : sel.focusNode
  // if (focusElementNew === focusElementOld) return

  // automatically constrain offset to text length
  // this may still throw an error if the text node does no exist any longer
  if (focusNode !== null) {
    try {
      range.setStart(focusNode, end ? getEndOffset() : (nodeOffset?.offset ?? offset))
    } catch (e) {
      console.warn(e)

      // better than nothing
      range.setStart(focusNode, getEndOffset())
    }
  }
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

/** Selects a range of the given node's plain text content, i.e. ignoring nested HTML. Used to restore a selection that was destroyed by a programmatic edit of the thought's value.
 *
  @param node     The node to set the selection on.
  @param start    Character offset of the start of the selection relative to the plain text content.
  @param end      Character offset of the end of the selection relative to the plain text content.
 */
export const setRange = (node: Node | null, { start, end }: { start: number; end: number }): void => {
  if (!node) return

  // convert the outer offsets (relative to the thought) to inner offsets (relative to the nearest ancestor of each end of the new selection), which is what Range expects
  // this handles nested HTML elements such as <b> or <i>
  const startNodeOffset = offsetFromClosestParent(node, start)
  const endNodeOffset = offsetFromClosestParent(node, end)
  if (!startNodeOffset || !endNodeOffset) return

  const startNode = startNodeOffset.node ?? node
  const endNode = endNodeOffset.node ?? node

  const sel = window.getSelection()
  if (!sel) return

  const range = document.createRange()

  try {
    range.setStart(startNode, startNodeOffset.offset)
    range.setEnd(endNode, endNodeOffset.offset)
  } catch (e) {
    console.warn(e)
    return
  }

  sel.removeAllRanges()
  sel.addRange(range)
}

/**
 * Split given root node into two different ranges at the given selection.
 */
export function splitNode(root: HTMLElement, range: Range): { left: Range; right: Range } | null {
  const { firstChild, lastChild } = root

  if (!firstChild || !lastChild) return null

  const rangeLeft = document.createRange()
  rangeLeft.setStartBefore(firstChild)
  rangeLeft.setEnd(range.startContainer, range.startOffset)

  const rangeRight = document.createRange()
  rangeRight.setStart(range.endContainer, range.endOffset)
  rangeRight.setEndAfter(lastChild)

  return {
    left: rangeLeft,
    right: rangeRight,
  }
}

/**
 * Returns the HTML before and after selection. If splitting within an element, restores missing tags. e.g. <b>ap|ple/b> -> { left: '<b>ap</b>', right: '<b>ple</b>' }. Return null if there is no selection or the element is not valid.
 */
export const split = (el: HTMLElement): SplitResult | null => {
  // Note: Jest triggers newThought with windowEvent which has window as target causing getOffsetWithinContent to fail
  if (!(el instanceof HTMLElement) || el.nodeType !== Node.ELEMENT_NODE) return null

  const selection = window.getSelection()

  if (!selection) return null

  const range = selection && selection.rangeCount > 0 ? selection?.getRangeAt(0) : null
  if (!range) return null

  const splitNodesResult = splitNode(el, range)
  if (!splitNodesResult) return null

  const leftDiv = document.createElement('div')
  const rightDiv = document.createElement('div')
  leftDiv.appendChild(splitNodesResult.left.cloneContents())
  rightDiv.appendChild(splitNodesResult.right.cloneContents())

  return {
    left: leftDiv.innerHTML,
    right: rightDiv.innerHTML,
  }
}

/**
 * Returns the position and height of the caret relative to the top left of the focused thought, or null if the caret is
 * not in a thought. This is the real caret's own geometry, so a faux caret rendered at the same offsets within another
 * thought is guaranteed to match it, no matter how the two thoughts' values differ (see MulticursorFauxCaret).
 */
export const caretRect = (): { x: number; y: number; height: number } | null => {
  const editable = document.activeElement
  if (!isHTMLElement(editable) || !isContentEditable(editable)) return null

  const editableRect = editable.getBoundingClientRect()
  const sel = window.getSelection()
  const range = sel?.rangeCount ? sel.getRangeAt(0) : null
  let rect = range?.getBoundingClientRect() ?? null

  // A collapsed range on an element node has no client rect. That is where a tap on the very beginning or end of the
  // text places the selection (see offsetFromClosestParent), so measure a range spanning the editable's content up to
  // the caret instead and take the trailing edge of its last rect, which is where the caret is rendered. An empty
  // range, i.e. a caret at the very beginning, has no rects either and falls through to the padding fallback below,
  // which is the same position.
  if (!rect?.height && range && editable.contains(range.startContainer)) {
    const measured = document.createRange()
    measured.setStart(editable, 0)
    measured.setEnd(range.startContainer, range.startOffset)
    const rects = measured.getClientRects()
    const last = rects[rects.length - 1]
    if (last?.height) rect = new DOMRect(last.right, last.y, 0, last.height)
  }

  // An empty thought, e.g. a cleared one, has no client rect, since the selection is on the element node rather than a
  // text node. Fall back to the start of the editable's content box, where the caret is rendered. The height is a
  // single line rather than the height of the editable, which spans several lines when a cleared thought's value is
  // rendered as a multiline placeholder.
  const [paddingTop, , paddingBottom, paddingLeft] = getElementPaddings(editable)
  const lineHeight = parseFloat(window.getComputedStyle(editable).lineHeight)
  return rect?.height
    ? { x: rect.x - editableRect.x, y: rect.y - editableRect.y, height: rect.height }
    : {
        x: paddingLeft,
        y: paddingTop,
        height: lineHeight || editableRect.height - paddingTop - paddingBottom,
      }
}

/** Returns the selection text, or null if there is no selection. */
export const text = () => window.getSelection()?.toString() ?? null

/** Select all text in an element. */
// TODO: Can this be combined with selection.set()?
export const select = (el: Element) => window.getSelection()?.selectAllChildren(el)

/** Removes the current selection. */
export const removeCurrentSelection = () => {
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) document.execCommand('delete')
}

/** Remove the useless HTMLElement from element. */
const removeEmptyElementsRecursively = (element: HTMLElement, remainText: string) => {
  // Loop through the child nodes of the element
  for (let i = element.childNodes.length - 1; i >= 0; i--) {
    const child = element.childNodes[i] as HTMLElement

    // Recursively check the child element
    removeEmptyElementsRecursively(child, remainText)

    if (!child.hasChildNodes() && child.textContent !== remainText) {
      child.remove()
    }
  }
}

/** Returns the selection html, or null if there is no selection. */
export const html = () => {
  const selection = document?.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const range = selection?.getRangeAt(0)

  if (range.startContainer.isEqualNode(range.endContainer)) {
    let containerHtml: string | null = null

    if (range && range.startContainer) {
      let node = range.startContainer

      // Check if the node is an Element using the instanceof operator
      if (node instanceof Element) {
        // When the caret is collapsed on the editable element itself (e.g. when the cursor is moved to a thought
        // by tapping its bullet), return the editable's inner HTML rather than its outerHTML, so that the wrapper
        // element and its attributes (such as placeholder="<b>…</b>", whose value contains raw HTML) are excluded
        // from the selection html (#3912).
        containerHtml = node.getAttribute('contenteditable') === 'true' ? node.innerHTML : node.outerHTML
      } else if (node instanceof CharacterData) {
        while (node.parentElement?.tagName !== 'DIV') {
          node = node.parentElement!
        }

        const parentElement = node.parentElement
        const clonedElement = parentElement.cloneNode(true) as HTMLElement
        removeEmptyElementsRecursively(clonedElement!, range.startContainer.textContent!)
        containerHtml = clonedElement ? clonedElement.innerHTML : null
      }
    }

    // iOS Safari converts non-breaking spaces into UTF-8 characters when accessing range textContent.
    // Convert them back into HTML character entities to ensure that REGEX_HTML_SINGLE_LINE matches (#3779).
    return containerHtml?.replace(range.startContainer.textContent!.replace(/\u00A0/g, '&nbsp;'), selection.toString())
  }

  const div = document.createElement('div')
  div.appendChild(range.cloneContents())
  const currentHtml = div.innerHTML
  return currentHtml
}

/** Returns the bounding rectangle for the current browser selection. */
export const getBoundingClientRect = () => {
  const selection = window.getSelection()

  if (selection && selection.rangeCount && isText()) return selection.getRangeAt(0).getBoundingClientRect()

  return null
}

/** Returns true if the point is within the given number of pixels from the browser selection. */
export const isNear = (
  x: number,
  y: number,
  /** Distance from the point (px). */
  distance: number,
): boolean => {
  if (!isActive() || isCollapsed()) return false

  const rect = getBoundingClientRect()
  if (!rect) return false

  const left = rect.left - distance
  const right = rect.right + distance
  const top = rect.top - distance
  const bottom = rect.bottom + distance

  return x >= left && y >= top && x <= right && y <= bottom
}
