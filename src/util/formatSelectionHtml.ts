import CommandState from '../@types/CommandState'
import { ALLOWED_FORMATTING_TAGS } from '../constants'
import getCommandState from './getCommandState'
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

/** Maps a plain-text character offset within a root node to a { node, offset } position on a text node. */
const positionAtOffset = (root: Node, target: number): { node: Node; offset: number } => {
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

/** Text color applied by a backColor command for contrast against the background (always black, per product design). */
const CONTRAST_COLOR = '#000000'

/** Determines the target text color and background for a single color command. A foreColor sets the text color and
 * clears the background; a backColor sets the background and forces a contrasting (black) text color. This folds
 * ColorPicker's former two-dispatch foreColor + backColor pairing into a single transform (#4637). */
const resolveColors = (
  command: 'foreColor' | 'backColor',
  colorValue: string | undefined,
): { color: string | null; background: string | null } =>
  command === 'foreColor'
    ? { color: colorValue ?? null, background: null }
    : { color: CONTRAST_COLOR, background: colorValue ?? null }

/** Applies a foreColor/backColor to the [start, end) range, consolidating into a single <font> element that carries
 * both the color attribute and the background-color style. The color command fully redetermines both properties (see
 * resolveColors), so existing color/background wrappers within the range are stripped before re-wrapping once. */
const applyColor = (
  container: HTMLElement,
  start: number,
  end: number,
  command: 'foreColor' | 'backColor',
  colorValue: string | undefined,
) => {
  const range = document.createRange()
  const s = positionAtOffset(container, start)
  const e = positionAtOffset(container, end)
  range.setStart(s.node, s.offset)
  range.setEnd(e.node, e.offset)

  // extract the range into a temp container so existing color/background wrappers can be stripped
  const temp = document.createElement('div')
  temp.appendChild(range.extractContents())
  for (const el of Array.from(temp.querySelectorAll<HTMLElement>('font, span'))) {
    el.replaceWith(...Array.from(el.childNodes))
  }
  temp.normalize()

  const { color, background } = resolveColors(command, colorValue)

  let insertNode: Node
  if (color || background) {
    const font = document.createElement('font')
    if (color) font.setAttribute('color', rgbToHex(color))
    if (background) font.style.backgroundColor = background
    while (temp.firstChild) font.appendChild(temp.firstChild)
    insertNode = font
  } else {
    const fragment = document.createDocumentFragment()
    while (temp.firstChild) fragment.appendChild(temp.firstChild)
    insertNode = fragment
  }

  insertAtRange(container, range, insertNode)
  // remove any now-empty formatting element left behind where the range was extracted
  removeEmptyFormatting(container)
}

/** Consolidates a whole-thought foreColor/backColor into a single <font> element carrying both the color attribute and
 * the background-color style. Only color wrappers (font/span) are stripped, so non-color formatting (b/i/u/code) that
 * wraps the thought is preserved. */
const consolidateWholeColor = (
  container: HTMLElement,
  command: 'foreColor' | 'backColor',
  colorValue: string | undefined,
) => {
  let color: string | null = null
  let background: string | null = null
  for (const el of Array.from(container.querySelectorAll<HTMLElement>('font, span'))) {
    color = el.getAttribute('color') || el.style.color || color
    background = el.style.backgroundColor || background
    el.replaceWith(...Array.from(el.childNodes))
  }
  container.normalize()

  if (command === 'foreColor') {
    color = colorValue ?? null
  } else {
    background = colorValue ?? null
  }

  if (!color && !background) return

  const font = document.createElement('font')
  if (color) font.setAttribute('color', rgbToHex(color))
  if (background) font.style.backgroundColor = background
  while (container.firstChild) font.appendChild(container.firstChild)
  container.appendChild(font)
}

/** Options for {@link formatSelectionHtml}. */
interface FormatOptions {
  /** Plain-text start offset of the range (inclusive). */
  start: number
  /** Plain-text end offset of the range (exclusive). */
  end: number
  /** The formatting command to apply. */
  command: FormatCommand
  /** The resolved color value (hex) for foreColor/backColor. */
  colorValue?: string
  /** Whether the command applies to the whole thought (collapsed caret or full selection). */
  whole: boolean
}

/**
 * Applies a formatting command to an HTML string over a plain-text [start, end) range, returning the new HTML.
 *
 * This is the synchronous replacement for document.execCommand: it computes the formatted markup directly rather than
 * mutating a contentEditable and waiting for the change to re-enter Redux (#4637).
 */
const formatSelectionHtml = (html: string, { start, end, command, colorValue, whole }: FormatOptions): string => {
  const container = document.createElement('div')
  container.innerHTML = html
  const tag = tagForCommand(command)

  // removeFormat: replace the range (or the whole thought) with its plain text
  if (command === 'removeFormat') {
    if (whole) {
      container.innerHTML = container.textContent ?? ''
    } else {
      const range = document.createRange()
      const s = positionAtOffset(container, start)
      const e = positionAtOffset(container, end)
      range.setStart(s.node, s.offset)
      range.setEnd(e.node, e.offset)
      const contents = range.extractContents()
      range.insertNode(document.createTextNode(contents.textContent ?? ''))
    }
    container.normalize()
    return container.innerHTML
  }

  if (whole) {
    if (tag) {
      // toggle the tag on/off based on whether the whole thought already has it applied
      const active = getCommandState(html)[command as keyof CommandState]
      if (active) {
        for (const el of Array.from(container.querySelectorAll(tag))) {
          el.replaceWith(...Array.from(el.childNodes))
        }
      } else {
        const wrapper = createWrapper(command)
        while (container.firstChild) wrapper.appendChild(container.firstChild)
        container.appendChild(wrapper)
      }
    } else {
      // color: consolidate the whole-thought foreColor/backColor into a single <font>, preserving non-color tags (b/i/u)
      consolidateWholeColor(container, command as 'foreColor' | 'backColor', colorValue)
    }
  } else if (tag) {
    // partial tag command: wrap the selected range in the formatting tag
    const range = document.createRange()
    const s = positionAtOffset(container, start)
    const e = positionAtOffset(container, end)
    range.setStart(s.node, s.offset)
    range.setEnd(e.node, e.offset)
    const wrapper = createWrapper(command)
    wrapper.appendChild(range.extractContents())
    range.insertNode(wrapper)
  } else {
    // partial color command: consolidate foreColor/backColor into a single <font> element over the range
    applyColor(container, start, end, command as 'foreColor' | 'backColor', colorValue)
  }

  container.normalize()
  return container.innerHTML
}

export default formatSelectionHtml
