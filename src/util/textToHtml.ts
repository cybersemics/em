import { parse } from 'jex-block-parser'
import { Block } from '../@types'
import { strip } from '../util'

export const REGEXP_CONTAINS_META_TAG = /<meta\s*.*?>/

// a list item tag
const regexpListItem = /<li(?:\s|>)/gim

const regexpLeadingSpacesAndBullet = /^\s*(?:[-—▪◦•]|\*\s)?/

// regex that checks if the value starts with closed html tag
// Note: This regex cannot check properly for a tag nested within itself. However for general cases it works properly.
const regexStartsWithClosedTag = /^<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)<\/\1>/ims

// starts with '-', '—' (emdash), ▪, ◦, •, or '*'' (excluding whitespace)
// '*'' must be followed by a whitespace character to avoid matching *footnotes or *markdown italic*
const regexpPlaintextBullet = /^\s*(?:[-—▪◦•]|\*\s)/m

/** Retrieves the content within the body tags of the given HTML. Returns the full string if no body tags are found. */
const bodyContent = (html: string) => {
  const matches = html.match(/<body[^>]*>([\w|\W]*)<\/body>/)
  return !matches || matches.length < 2 ? html : matches[1]
}

/**
 * Check if clipboard data copied from an app such as (Webstorm, Notes, Notion..).
 */
const isCopiedFromApp = (htmlText: string) => REGEXP_CONTAINS_META_TAG.test(htmlText)

/** Converts data output from jex-block-parser into HTML.
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
      const value = block.scope.replace(regexpPlaintextBullet, '').trim()
      const childrenHtml = block.children.length > 0 ? `<ul>${blocksToHtml(block.children)}</ul>` : ''
      return value || childrenHtml ? `<li>${value}${childrenHtml}</li>` : ''
    })
    .join('')
/**
 * Move leading spaces and bullet indicator to the beginning.
 *
 * @example
 * <b>  - B</b>
 * to
 *   -<b> B</b>
 */
const moveLeadingSpacesToBeginning = (line: string) => {
  if (regexpPlaintextBullet.test(line)) {
    return line
  }
  const trimmedText = strip(line, { preserveFormatting: false, preventTrim: true })
  const matches = trimmedText.match(regexpLeadingSpacesAndBullet)
  return matches ? matches[0] + line.replace(matches[0], '') : line
}

/**
 * Parse html body content.
 */
const parseBodyContent = (html: string) => {
  const content = bodyContent(html)
  // If content has <li> tags, don't convert content to blocks and then again html.
  if (regexpListItem.test(content)) {
    return content
  }
  const stripped = strip(content, { preserveFormatting: true }).split('\n').map(moveLeadingSpacesToBeginning).join('\n')

  return blocksToHtml(parse(unescape(stripped)))
}

/** Parses plaintext, indented text, or HTML and converts it into HTML that himalaya can parse. */
export const textToHtml = (text: string) => {
  // if the input text starts with a closed html tag
  const isHTML = regexStartsWithClosedTag.test(text.trim()) || isCopiedFromApp(text.trim())
  const decodedInputText = unescape(text)

  // use jex-block-parser to convert indentent plaintext into nested HTML lists
  const parsedInputText = !isHTML ? blocksToHtml(parse(decodedInputText)) : decodedInputText

  // true plaintext won't have any <li>'s or <p>'s
  // transform newlines in plaintext into <li>'s
  return !isHTML
    ? parsedInputText
        .split('\n')
        .map(line => `${line.replace(regexpPlaintextBullet, '').trim()}`)
        .join('')
    : // if it's an entire HTML page, ignore everything outside the body tags
      parseBodyContent(text)
}
