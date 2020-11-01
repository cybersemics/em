// @ts-ignore
import { parse } from 'jex-block-parser'
import _ from 'lodash'
import he from 'he'
import { parentOf, convertHTMLtoJSON, head, importJSON, pathToContext, reducerFlow, rootedParentOf, strip } from '../util'
import { existingThoughtChange, setCursor, updateThoughts } from '../reducers'
import { simplifyPath } from '../selectors'
import { Block, Path, Timestamp } from '../types'
import { State } from '../util/initialState'

/** Parse blocks of text based on indentation. */
declare function parse(text: string): Block[]

// a list item tag
const regexpListItem = /<li(?:\s|>)/gmi
// starts with '-', '—' (emdash), ▪, ◦, •, or '*'' (excluding whitespace)
// '*'' must be followed by a whitespace character to avoid matching *footnotes or *markdown italic*
const regexpPlaintextBullet = /^\s*(?:[-—▪◦•]|\*\s)/m

// has at least one list item or paragraph
const regexpHasListItems = /<li|p(?:\s|>).*?>.*<\/li|p>/mi

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
  parsedBlocks.map(block => {
    const value = block.scope.replace(regexpPlaintextBullet, '').trim()
    const childrenHtml = block.children.length > 0
      ? `<ul>${blocksToHtml(block.children)}</ul>`
      : ''
    return value || childrenHtml
      ? `<li>${value}${childrenHtml}</li>`
      : ''
  }
  ).join('')

/** Retrieves the content within the body tags of the given HTML. Returns the full string if no body tags are found. */
const bodyContent = (html: string) => {
  const htmlLowerCase = html.toLowerCase()
  const startTag = htmlLowerCase.indexOf('<body')
  const bodyTagLength = startTag !== -1
    ? htmlLowerCase.slice(0, startTag).indexOf('>')
    : 0
  const endTag = htmlLowerCase.indexOf('</body>')

  return startTag === -1
    ? html
    : html.slice(startTag + bodyTagLength, endTag !== -1 ? endTag : html.length)
}

/** Parses plaintext, indented text, or HTML and converts it into HTML that himalaya can parse. */
const rawTextToHtml = (text: string) => {

  // if the input text has any <li> elements at all, treat it as HTML
  const isHTML = regexpHasListItems.test(text)
  const decodedInputText = he.decode(text)

  // use jex-block-parser to convert indentent plaintext into nested HTML lists
  const parsedInputText = !isHTML
    ? blocksToHtml(parse(decodedInputText))
    : decodedInputText

  // true plaintext won't have any <li>'s or <p>'s
  // transform newlines in plaintext into <li>'s
  return !isHTML
    ? parsedInputText
      .split('\n')
      .map(line => `${line.replace(regexpPlaintextBullet, '').trim()}`)
      .join('')
    // if it's an entire HTML page, ignore everything outside the body tags
    : bodyContent(text)
}

interface Options {
  path: Path,
  text: string,
  lastUpdated?: Timestamp,
  preventSetCursor?: boolean,
  rawDestValue?: string,
  skipRoot?: boolean,
}

/** Imports thoughts from html or raw text.
 *
 * @param lastUpdated       Set the lastUpdated timestamp on the imported thoughts. Default: now.
 * @param preventSetCursor  Prevents the default behavior of setting the cursor to the last thought at the first level.
 * @param rawDestValue      When pasting after whitespace, e.g. Pasting "b" after "a ", the normal destValue has already been trimmed, which would result in "ab". We need to pass the untrimmed.destination value in so that it can be trimmed after concatenation.
 * @param skipRoot          See importHtml @param.
 */
const importText = (state: State, { path, text, lastUpdated, preventSetCursor, rawDestValue, skipRoot }: Options): State => {

  const simplePath = simplifyPath(state, path)
  const html = rawTextToHtml(text)
  const numLines = (html.match(regexpListItem) || []).length
  const destThought = head(path)
  const destValue = rawDestValue || destThought.value

  // if we are only importing a single line of html, then simply modify the current thought
  if (numLines === 1) {

    const newText = strip(html, { preserveFormatting: true })

    // get the range if there is one so that we can import over the selected html
    const selection = window.getSelection()
    const [startOffset, endOffset] = selection && selection.rangeCount > 0
      ? (() => {
        const range = selection.getRangeAt(0)
        const offsets = [range.startOffset, range.endOffset]
        range.collapse()
        return offsets
      })()
      : [0, 0]

    // insert the newText into the destValue in the correct place
    // trim after concatenating in case destValue has whitespace
    const newValue = (destValue.slice(0, startOffset) + newText + destValue.slice(endOffset)).trim()

    return reducerFlow([

      existingThoughtChange({
        oldValue: destValue,
        newValue,
        context: rootedParentOf(pathToContext(path)),
        path: simplePath,
      }),

      !preventSetCursor && path ? setCursor({
        path: [...parentOf(path), { ...destThought, value: newValue }],
        offset: startOffset + newText.length,
      }) : null,

    ])(state)

  }
  else {
    const json = convertHTMLtoJSON(html)
    const imported = importJSON(state, simplePath, json, { lastUpdated, skipRoot })
    const lastChild = imported.lastThoughtFirstLevel

    return reducerFlow([

      updateThoughts(imported),

      // restore the selection to the first imported thought
      !preventSetCursor && lastChild ? setCursor({
        path: [...parentOf(path), lastChild],
        offset: lastChild.value.length,
      }) : null,

    ])(state)
  }
}

export default _.curryRight(importText)
