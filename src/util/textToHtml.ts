import DOMPurify from 'dompurify'
import _ from 'lodash'
import { parse } from 'text-block-parser'
import Block from '../@types/Block'
import { ALLOWED_ATTR, ALLOWED_TAGS, REGEX_NONFORMATTING_HTML } from '../constants'

// regex that checks if the value starts with closed html tag
// Note: This regex cannot check properly for a tag nested within itself. However for general cases it works properly.
const REGEX_STARTS_WITH_CLOSED_TAG = /^<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)<\/\1>/ims

// starts with '-', '—' (emdash), ▪, ◦, •, or '*'' (excluding whitespace)
// '*'' must be followed by a whitespace character to avoid matching *footnotes or *markdown italic*
const REGEX_PLAINTEXT_BULLET = /^\s*(?:[-—▪◦•]|\*\s)/m

// Text content enclosed in double asterisks '**' representing markdown bold (non-greedy).
// Example: **markdown bold**
const REGEX_MARKDOWN_BOLD = /\*\*([^<]+?)\*\*/g

// Text content enclosed in single asterisks '*' representing markdown italics (non-greedy).
// Example: *markdown italics*
const REGEX_MARKDOWN_ITALICS = /\*([^<]+?)\*/g

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
  // if the input text starts with a closed html tag
  const isHtml = REGEX_NONFORMATTING_HTML.test(input) || REGEX_STARTS_WITH_CLOSED_TAG.test(input.trim())

  // if text is HTML page, return the innerHTML of the body tag
  // otherwise use text-block-parser to convert indented plaintext into nested HTML lists
  const html = isHtml ? input : blocksToHtml(parse(input, Infinity))

  return html
    .split('\n')
    .map(
      line =>
        `${line
          .replace(REGEX_PLAINTEXT_BULLET, '')
          .replace(REGEX_MARKDOWN_BOLD, '<b>$1</b>')
          .replace(REGEX_MARKDOWN_ITALICS, '<i>$1</i>')
          .trim()}`,
    )
    .join('')
}

export default textToHtml
