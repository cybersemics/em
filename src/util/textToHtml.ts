import DOMPurify from 'dompurify'
import _ from 'lodash'
import { parse } from 'text-block-parser'
import Block from '../@types/Block'
import { ALLOWED_ATTR, ALLOWED_TAGS, REGEX_NONFORMATTING_HTML, REGEX_PLAINTEXT_BULLET } from '../constants'

// regex that checks if the value starts with closed html tag
// Note: This regex cannot check properly for a tag nested within itself. However for general cases it works properly.
const REGEX_STARTS_WITH_CLOSED_TAG = /^<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)<\/\1>/ims

// Text content enclosed in double asterisks '**' representing markdown bold (non-greedy).
// Example: **markdown bold**
const REGEX_MARKDOWN_BOLD = /\*\*([^<]+?)\*\*/g

// Text content enclosed in single asterisks '*' representing markdown italics (non-greedy).
// Example: *markdown italics*
const REGEX_MARKDOWN_ITALICS = /\*([^<]+?)\*/g

/** Detects an RTF document. */
const REGEX_RTF = /^\s*\{\\rtf/i

/** Control words that indicate ignorable RTF destination groups. */
const RTF_IGNORED_DESTINATIONS = new Set([
  'annotation',
  'atnauthor',
  'atnrefend',
  'atnrefstart',
  'colortbl',
  'datastore',
  'filetbl',
  'fonttbl',
  'footer',
  'footerf',
  'footerl',
  'footerr',
  'generator',
  'header',
  'headerf',
  'headerl',
  'headerr',
  'info',
  'listoverride',
  'listoverridetable',
  'listtable',
  'mmathpr',
  'object',
  'pict',
  'private',
  'revtbl',
  'rsidtbl',
  'stylesheet',
  'themedata',
  'xmlnstbl',
])

interface RtfFormattingState {
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
}

/** Wraps escaped text with enabled formatting tags. */
const applyFormatting = (value: string, formatting: RtfFormattingState) => {
  const withBold = formatting.bold ? `<b>${value}</b>` : value
  const withItalic = formatting.italic ? `<i>${withBold}</i>` : withBold
  const withUnderline = formatting.underline ? `<u>${withItalic}</u>` : withItalic
  return formatting.strikethrough ? `<strike>${withUnderline}</strike>` : withUnderline
}

/** Converts an RTF document into plaintext with inline formatting tags.
 *
 * Supports a focused subset of RTF for dropped files:
 * - text and line breaks.
 * - bold/italic/underline/strikethrough toggles.
 * - unicode escapes (\uN with \ucN fallback semantics).
 *
 * Ignores non-content destination groups such as font and color tables.
 * Returns normalized text that may contain `<b>`, `<i>`, `<u>`, and `<strike>` tags.
 */
const rtfToTaggedText = (rtf: string) => {
  const formattingStack: RtfFormattingState[] = [{ bold: false, italic: false, underline: false, strikethrough: false }]
  const skipDestinationStack = [false]
  const output: string[] = []
  let buffer = ''
  let index = 0
  let unicodeFallbackLength = 1
  let skipFallbackChars = 0

  /** Appends the current text buffer to output with formatting tags. */
  const flushBuffer = () => {
    if (!buffer) return
    output.push(applyFormatting(_.escape(buffer), formattingStack[formattingStack.length - 1]))
    buffer = ''
  }

  /** Appends text while honoring unicode fallback skip length. */
  const appendText = (text: string) => {
    if (skipDestinationStack[skipDestinationStack.length - 1]) return
    const chars = [...text]
    chars.forEach(char => {
      if (skipFallbackChars > 0) {
        skipFallbackChars -= 1
        return
      }
      buffer += char
    })
  }

  while (index < rtf.length) {
    const char = rtf[index]

    if (char === '{') {
      formattingStack.push({ ...formattingStack[formattingStack.length - 1] })
      skipDestinationStack.push(skipDestinationStack[skipDestinationStack.length - 1])
      index += 1
      continue
    }

    if (char === '}') {
      flushBuffer()
      if (formattingStack.length > 1) formattingStack.pop()
      if (skipDestinationStack.length > 1) skipDestinationStack.pop()
      index += 1
      continue
    }

    if (char !== '\\') {
      appendText(char)
      index += 1
      continue
    }

    const symbol = rtf[index + 1]
    if (!symbol) break

    if (symbol === "'" && /^[0-9a-f]{2}$/i.test(rtf.slice(index + 2, index + 4))) {
      appendText(String.fromCharCode(parseInt(rtf.slice(index + 2, index + 4), 16)))
      index += 4
      continue
    }

    if (symbol === '\\' || symbol === '{' || symbol === '}') {
      appendText(symbol)
      index += 2
      continue
    }

    if (!/[a-z]/i.test(symbol)) {
      if (symbol === '*') skipDestinationStack[skipDestinationStack.length - 1] = true
      if (symbol === '~') appendText(' ')
      if (symbol === '_') appendText('-')
      index += 2
      continue
    }

    let cursor = index + 1
    while (cursor < rtf.length && /[a-z]/i.test(rtf[cursor])) {
      cursor += 1
    }
    const word = rtf.slice(index + 1, cursor).toLowerCase()

    let param: number | null = null
    const paramMatch = rtf.slice(cursor).match(/^-?\d+/)
    if (paramMatch) {
      param = parseInt(paramMatch[0], 10)
      cursor += paramMatch[0].length
    }

    if (rtf[cursor] === ' ') cursor += 1

    if (word === 'uc' && param != null) {
      // \ucN defines how many fallback characters after \uN should be skipped.
      unicodeFallbackLength = Math.max(0, param)
      index = cursor
      continue
    }

    if (word === 'u' && param != null) {
      appendText(String.fromCharCode(param < 0 ? param + 65536 : param))
      skipFallbackChars = unicodeFallbackLength
      index = cursor
      continue
    }

    if (RTF_IGNORED_DESTINATIONS.has(word)) {
      skipDestinationStack[skipDestinationStack.length - 1] = true
      index = cursor
      continue
    }

    if (word === 'par' || word === 'line') {
      flushBuffer()
      output.push('\n')
      index = cursor
      continue
    }

    if (word === 'tab') {
      appendText('\t')
      index = cursor
      continue
    }

    if (word === 'b' || word === 'i' || word === 'ul' || word === 'strike' || word === 'ulnone') {
      flushBuffer()
      const formatting = formattingStack[formattingStack.length - 1]
      if (word === 'b') formatting.bold = param == null || param !== 0
      if (word === 'i') formatting.italic = param == null || param !== 0
      if (word === 'ul') formatting.underline = param == null || param !== 0
      if (word === 'ulnone') formatting.underline = false
      if (word === 'strike') formatting.strikethrough = param == null || param !== 0
      index = cursor
      continue
    }

    index = cursor
  }

  flushBuffer()
  return output
    .join('')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

/** Converts data output from text-block-parser into HTML.
 *
 @example
 [ { scope: 'fruits',
    children:
     [ { scope: '  apple',
         children:
          [ { scope: '    gala', children: [] },
            { scope: '    pink lady', children: [] } ] },
       { scope: '  pear', children: [] },
       { scope: '  cherry',
         children: [ { scope: '    white', children: [] } ] } ] },
 { scope: 'veggies',
    children:
     [ { scope: '  kale',
         children: [ { scope: '    red russian', children: [] } ] },
       { scope: '  cabbage', children: [] },
       { scope: '  radish', children: [] } ] } ]
 to:
 <li>fruits<ul>
 <li>apple<ul>
 <li>gala</li>
 <li>pink lady</li>
 </ul></li>
 <li>pear</li>
 ...
 </ul></li>
 */
const blocksToHtml = (parsedBlocks: Block[]): string =>
  parsedBlocks
    .map(block => {
      const value = DOMPurify.sanitize(block.scope.replace(REGEX_PLAINTEXT_BULLET, '').trim(), {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
      })
      const childrenHtml = block.children.length > 0 ? `<ul>${blocksToHtml(block.children)}</ul>` : ''
      return value || childrenHtml ? `<li>${value}${childrenHtml}</li>` : ''
    })
    .join('\n')

/** Parses plaintext, indented text, or HTML and converts it into HTML that himalaya can parse. */
const textToHtml = (input: string) => {
  const normalizedInput = REGEX_RTF.test(input) ? rtfToTaggedText(input) : input

  // if the input text starts with a closed html tag
  const isHtml =
    REGEX_NONFORMATTING_HTML.test(normalizedInput) || REGEX_STARTS_WITH_CLOSED_TAG.test(normalizedInput.trim())

  // if text is HTML page, return the innerHTML of the body tag
  // otherwise use text-block-parser to convert indented plaintext into nested HTML lists
  const html = isHtml ? normalizedInput : blocksToHtml(parse(normalizedInput, Infinity))

  return (
    html
      .split('\n')
      .map(
        line =>
          `${line
            .replace(REGEX_PLAINTEXT_BULLET, '')
            .replace(REGEX_MARKDOWN_BOLD, '<b>$1</b>')
            .replace(REGEX_MARKDOWN_ITALICS, '<i>$1</i>')
            .trim()}`,
      )
      /* Join lines with space, otherwise words can become crunched together.
       * e.g. The following is rendered with a space between "hello" and "world" in the browser, even though there is no space character present. The newline and tabs are collapsed into a single space and the words are rendered inline since they are part of the same text node
       * \t\t<p>hello\n\t\tworld</p>
       */
      .join(' ')
  )
}

export default textToHtml
