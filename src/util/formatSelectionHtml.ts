import CommandState from '../@types/CommandState'
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

/** Creates the wrapper element for a formatting command, mirroring the markup document.execCommand produces. */
const createWrapper = (command: FormatCommand, colorValue?: string): HTMLElement => {
  // foreColor is emitted by execCommand as <font color="#hex">
  if (command === 'foreColor') {
    const font = document.createElement('font')
    if (colorValue) font.setAttribute('color', rgbToHex(colorValue))
    return font
  }
  // backColor is emitted by execCommand as <span style="background-color: rgb(...)">
  if (command === 'backColor') {
    const span = document.createElement('span')
    if (colorValue) span.style.backgroundColor = colorValue
    return span
  }
  return document.createElement(tagForCommand(command) || 'span')
}

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

/** Consolidates a whole-thought foreColor/backColor into a single <font> element carrying both the color attribute and
 * the background-color style, replacing any existing color/background wrappers (including partial inner ones). */
const consolidateWholeColor = (
  container: HTMLElement,
  command: 'foreColor' | 'backColor',
  colorValue: string | undefined,
) => {
  // Gather the existing whole-thought color state and strip every color/background wrapper — including partial inner
  // ones, which a whole-thought color overrides — then re-wrap the whole content in a single <font> that carries both
  // the color attribute and the background-color style. This mirrors execCommand, which merges foreColor + backColor
  // onto one element rather than nesting a <span> inside a <font>.
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
        const wrapper = createWrapper(command, colorValue)
        while (container.firstChild) wrapper.appendChild(container.firstChild)
        container.appendChild(wrapper)
      }
    } else {
      // color: consolidate the whole-thought foreColor/backColor into a single <font> element
      consolidateWholeColor(container, command as 'foreColor' | 'backColor', colorValue)
    }
  } else {
    const range = document.createRange()
    const s = positionAtOffset(container, start)
    const e = positionAtOffset(container, end)
    range.setStart(s.node, s.offset)
    range.setEnd(e.node, e.offset)
    const wrapper = createWrapper(command, colorValue)
    wrapper.appendChild(range.extractContents())
    range.insertNode(wrapper)
  }

  container.normalize()
  return container.innerHTML
}

export default formatSelectionHtml
