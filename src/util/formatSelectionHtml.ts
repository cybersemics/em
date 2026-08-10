import { ALLOWED_FORMATTING_TAGS } from '../constants'
import resolveSelectionColors from './resolveSelectionColors'
import rgbToHex from './rgbToHex'

/** A formatting command that maps to a single HTML tag toggle. */
type TagCommand = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code'

/** All formatting commands handled by the synchronous transform. */
export type FormatCommand = TagCommand | 'foreColor' | 'backColor' | 'removeFormat'

/** Command → HTML tag for the simple toggle formatting commands (mirrors document.execCommand output). */
const TAG_BY_COMMAND: Record<TagCommand, string> = {
  bold: 'b',
  italic: 'i',
  underline: 'u',
  strikethrough: 'strike',
  code: 'code',
}

/** Returns the tag name for a tag command, or undefined for color/removeFormat commands. */
const tagForCommand = (command: FormatCommand): string | undefined =>
  command in TAG_BY_COMMAND ? TAG_BY_COMMAND[command as TagCommand] : undefined

/** Creates the wrapper element for a tag formatting command (bold/italic/underline/strikethrough/code). */
const createWrapper = (command: FormatCommand): HTMLElement => document.createElement(tagForCommand(command) || 'span')

/** Unwraps every element matching the selector within the root, replacing each with its child nodes (removing the tag
 * while preserving its content). */
const unwrapAll = (root: Element | DocumentFragment, selector: string) => {
  for (const el of Array.from(root.querySelectorAll(selector))) {
    el.replaceWith(...Array.from(el.childNodes))
  }
}

/** Wraps an extracted fragment in the command's tag, first unwrapping any nested instances of the same tag so the
 * result doesn't nest redundantly (e.g. bolding a whole thought that already has a bold substring). */
const wrapWithTag = (fragment: DocumentFragment, command: FormatCommand): HTMLElement => {
  unwrapAll(fragment, tagForCommand(command)!)
  const wrapper = createWrapper(command)
  wrapper.appendChild(fragment)
  wrapper.normalize()
  return wrapper
}

/** A { node, offset } position on a text node, as resolved from a plain-text offset. */
type Position = { node: Node; offset: number }

/** Maps a plain-text character offset within a root node to a { node, offset } position on a text node. */
const positionAtOffset = (root: Node, target: number): Position => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let last: Text | null = null
  let remaining = target
  let node = walker.nextNode() as Text | null
  while (node) {
    const len = node.textContent?.length ?? 0
    if (remaining <= len) return { node, offset: remaining }
    remaining -= len
    last = node
    node = walker.nextNode() as Text | null
  }
  if (last) return { node: last, offset: last.textContent?.length ?? 0 }
  return { node: root, offset: 0 }
}

/** Returns the nearest ancestor element of the given tag (within container), starting from node, or null. */
const closestTag = (node: Node, container: Node, tag: string): HTMLElement | null => {
  let n: Node | null = node.nodeType === Node.ELEMENT_NODE ? node : node.parentNode
  while (n && n !== container) {
    if (n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).tagName.toLowerCase() === tag) return n as HTMLElement
    n = n.parentNode
  }
  return null
}

/** Returns true if every selected character in the [s, e) range is already inside an element of the given tag, i.e. the
 * range is fully formatted and applying the command should toggle it off rather than wrap it again. */
const isRangeFullyTagged = (container: HTMLElement, s: Position, e: Position, tag: string): boolean => {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let started = false
  let sawText = false
  let node = walker.nextNode() as Text | null
  while (node) {
    if (node === s.node) started = true
    if (started) {
      const len = node.textContent?.length ?? 0
      const from = node === s.node ? s.offset : 0
      const to = node === e.node ? e.offset : len
      // only require a tag ancestor for nodes that actually contribute selected characters (skip zero-width boundaries)
      if (to > from) {
        if (!closestTag(node, container, tag)) return false
        sawText = true
      }
    }
    if (node === e.node) break
    node = walker.nextNode() as Text | null
  }
  return sawText
}

/** Returns the plain-text character offset of the start of el within container. */
const plainOffsetOf = (container: HTMLElement, el: Element): number => {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let offset = 0
  let node = walker.nextNode()
  while (node) {
    if (el.contains(node)) return offset
    offset += node.textContent?.length ?? 0
    node = walker.nextNode()
  }
  return offset
}

/** Splits the enclosing tag element (if any) at the plain-text offset, so the point becomes a boundary between two
 * sibling tag elements. A no-op if the offset is not inside a tag element or lands on its edge. Used to expose a
 * sub-range for toggling the tag off. */
const splitTagAtOffset = (container: HTMLElement, offset: number, tag: string) => {
  const pos = positionAtOffset(container, offset)
  const tagEl = closestTag(pos.node, container, tag)
  if (!tagEl) return
  const tail = document.createRange()
  tail.setStart(pos.node, pos.offset)
  tail.setEnd(tagEl, tagEl.childNodes.length)
  const contents = tail.extractContents()
  if ((contents.textContent ?? '') !== '') {
    const newTag = document.createElement(tag)
    newTag.appendChild(contents)
    tagEl.after(newTag)
  }
  if ((tagEl.textContent ?? '') === '') tagEl.remove()
}

/** Removes empty formatting elements (e.g. the <font> left behind after extractContents splits a colored range). */
const removeEmptyFormatting = (container: HTMLElement) => {
  for (const el of Array.from(container.querySelectorAll(ALLOWED_FORMATTING_TAGS.join(',')))) {
    if ((el.textContent ?? '') === '') el.remove()
  }
}

/** Returns true if the node is a formatting element (b/i/u/font/span/etc.). */
const isFormattingElement = (node: Node): node is HTMLElement =>
  node.nodeType === Node.ELEMENT_NODE && ALLOWED_FORMATTING_TAGS.includes((node as HTMLElement).tagName.toLowerCase())

/** Inserts a node at the (collapsed) range, lifting out of any empty formatting ancestors that extractContents left
 * behind. Without this, re-coloring content that already fills a single wrapper (e.g. the second dispatch of a
 * foreColor + backColor pair) would nest the new <font> inside the emptied one instead of replacing it. */
const insertAtRange = (container: HTMLElement, range: Range, node: Node) => {
  // Climb from the insertion point to the outermost formatting ancestor that extractContents left empty, and replace
  // it with the node. (The collapsed range often sits on an empty text node inside the emptied wrapper.)
  let emptyAncestor: HTMLElement | null = null
  for (let n: Node | null = range.startContainer; n && n !== container; n = n.parentNode) {
    if (isFormattingElement(n) && (n.textContent ?? '') === '') emptyAncestor = n
  }
  if (emptyAncestor) {
    emptyAncestor.replaceWith(node)
  } else {
    range.insertNode(node)
  }
}

/** Applies a foreColor/backColor to the given range (a sub-range or the whole thought's contents), consolidating into a
 * single <font> element that carries both the color attribute and the background-color style. The color command fully
 * redetermines both properties (see resolveSelectionColors), so existing color/background wrappers within the range are stripped
 * before re-wrapping once. Non-color formatting (b/i/u/code) within the range is preserved. */
const applyColor = (
  container: HTMLElement,
  range: Range,
  command: 'foreColor' | 'backColor',
  colorValue: string | undefined,
  defaultColor: string | undefined,
  defaultBackgroundColor: string | undefined,
) => {
  // extract the range into a temp container so existing color/background wrappers can be stripped
  const temp = document.createElement('div')
  temp.appendChild(range.extractContents())
  unwrapAll(temp, 'font, span')
  temp.normalize()

  const { color, background } = resolveSelectionColors(command, colorValue, defaultColor, defaultBackgroundColor)

  // move the (color-stripped) content into a fragment, wrapping it in a single <font> when a color/background applies
  const content = document.createDocumentFragment()
  while (temp.firstChild) content.appendChild(temp.firstChild)

  let insertNode: Node = content
  if (color || background) {
    const font = document.createElement('font')
    if (color) font.setAttribute('color', rgbToHex(color))
    if (background) font.style.backgroundColor = background
    font.appendChild(content)
    insertNode = font
  }

  insertAtRange(container, range, insertNode)
  // remove any now-empty formatting element left behind where the range was extracted
  removeEmptyFormatting(container)
}

/** Options for {@link formatSelectionHtml}. */
interface FormatOptions {
  /** Plain-text start offset of the range (inclusive). Defaults to 0, i.e. the start of the html. */
  start?: number
  /** Plain-text end offset of the range (exclusive). Defaults to the plain-text length of the html, i.e. the end. */
  end?: number
  /** The formatting command to apply. */
  command: FormatCommand
  /** The resolved color value (hex) for foreColor/backColor. */
  colorValue?: string
  /** The theme's default text color (hex); color/background matching this is stripped after a color command. */
  defaultColor?: string
  /** The theme's default background color (hex); used to detect a background-reset no-op and stripped after a color command. */
  defaultBackgroundColor?: string
}

/**
 * Applies a formatting command to an HTML string over a plain-text [start, end) range, returning the new HTML.
 * The start and end offsets default to the full range, as in slice.
 *
 * This is the synchronous replacement for document.execCommand: it computes the formatted markup directly rather than
 * mutating a contentEditable and waiting for the change to re-enter Redux (#4637).
 */
const formatSelectionHtml = (
  html: string,
  { start: startOption, end: endOption, command, colorValue, defaultColor, defaultBackgroundColor }: FormatOptions,
): string => {
  const container = document.createElement('div')
  container.innerHTML = html

  const tag = tagForCommand(command)
  const plainLength = container.textContent?.length ?? 0

  const start = startOption ?? 0
  const end = endOption ?? plainLength

  // The caller normalizes a collapsed caret or full selection to [0, plainLength], so this is a whole-thought command.
  const whole = start === 0 && end === plainLength

  // resolve the range endpoints once; several branches reuse them
  const s = positionAtOffset(container, start)
  const e = positionAtOffset(container, end)

  /** Builds a Range over the target: the whole thought's contents (selecting the outer wrapper elements too, so a wrap
   * grabs them) or the plain-text sub-range. */
  const makeRange = (): Range => {
    const range = document.createRange()
    if (whole) {
      range.selectNodeContents(container)
    } else {
      range.setStart(s.node, s.offset)
      range.setEnd(e.node, e.offset)
    }
    return range
  }

  if (command === 'removeFormat') {
    // replace the range (whole thought or sub-range) with its plain text
    const range = makeRange()
    range.insertNode(document.createTextNode(range.extractContents().textContent ?? ''))
  } else if (tag && isRangeFullyTagged(container, s, e, tag)) {
    // toggle the tag off (the range is already fully formatted): split the enclosing tag at both boundaries so the
    // range's content sits in its own tag element(s), then unwrap every tag element within [start, end], leaving the
    // tag intact on either side (e.g. bolding "orl" in "<b>World</b>" → "<b>W</b>orl<b>d</b>").
    splitTagAtOffset(container, end, tag)
    splitTagAtOffset(container, start, tag)
    for (const el of Array.from(container.querySelectorAll(tag))) {
      const elStart = plainOffsetOf(container, el)
      if (elStart >= start && elStart + (el.textContent?.length ?? 0) <= end) {
        el.replaceWith(...Array.from(el.childNodes))
      }
    }
    removeEmptyFormatting(container)
  } else if (tag) {
    // wrap the range in the tag, collapsing any nested same-tags
    const range = makeRange()
    range.insertNode(wrapWithTag(range.extractContents(), command))
    removeEmptyFormatting(container)
  } else {
    // color: consolidate the range's foreColor/backColor into a single <font>, preserving non-color tags (b/i/u)
    applyColor(
      container,
      makeRange(),
      command as 'foreColor' | 'backColor',
      colorValue,
      defaultColor,
      defaultBackgroundColor,
    )
  }

  container.normalize()
  return container.innerHTML
}

export default formatSelectionHtml
