import { parse } from 'jex-block-parser'
import _ from 'lodash'
import { unescape } from 'html-escaper'
import { getTextContentFromHTML, parentOf, convertHTMLtoJSON, head, importJSON, pathToContext, reducerFlow, roamJsonToBlocks, strip, validateRoam, createId } from '../util'
import { existingThoughtChange, setCursor, updateThoughts } from '../reducers'
import { getAllChildren, rankThoughtsFirstMatch, simplifyPath, rootedParentOf } from '../selectors'
import { Block, Path, SimplePath, Timestamp } from '../types'
import { State } from '../util/initialState'
import newThought from './newThought'
import collapseContext from './collapseContext'
import sanitize from 'sanitize-html'
import { ALLOWED_ATTRIBUTES, ALLOWED_TAGS, REGEXP_CONTAINS_META_TAG } from '../constants'
// import { HOME_TOKEN } from '../constants'

// a list item tag
const regexpListItem = /<li(?:\s|>)/gmi
// starts with '-', '—' (emdash), ▪, ◦, •, or '*'' (excluding whitespace)
// '*'' must be followed by a whitespace character to avoid matching *footnotes or *markdown italic*
const regexpPlaintextBullet = /^\s*(?:[-—▪◦•]|\*\s)/m

const regexpLeadingSpacesAndBullet = /^\s*(?:[-—▪◦•]|\*\s)?/

// regex that checks if the value starts with closed html tag
// Note: This regex cannot check properly for a tag nested within itself. However for general cases it works properly.
const regexStartsWithClosedTag = /^<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)<\/\1>/ism

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
  const matches = html.match(/<body[^>]*>([\w|\W]*)<\/body>/)
  return !matches || matches.length < 2 ? html : matches[1]
}

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
  const stripped = strip(content, { preserveFormatting: true })
    .split('\n')
    .map(moveLeadingSpacesToBeginning)
    .join('\n')

  return blocksToHtml(parse(unescape(stripped)))
}
/** Parses plaintext, indented text, or HTML and converts it into HTML that himalaya can parse. */
const rawTextToHtml = (text: string) => {

  // if the input text starts with a closed html tag
  const isHTML = regexStartsWithClosedTag.test(text.trim()) || isCopiedFromApp(text.trim())
  const decodedInputText = unescape(text)

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
    : parseBodyContent(text)
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

  const isRoam = validateRoam(text)

  const simplePath = simplifyPath(state, path)
  const context = pathToContext(simplePath)
  const convertedText = isRoam ? text : rawTextToHtml(text)
  const numLines = (convertedText.match(regexpListItem) || []).length
  const destThought = head(path)
  const destValue = rawDestValue || destThought.value

  // if we are only importing a single line of html, then simply modify the current thought
  if (numLines <= 1 && !isRoam) {
    const textNormalized = strip(convertedText, { preserveFormatting: true })

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

    // insert the textNormalized into the destValue in the correct place
    // trim after concatenating in case destValue has whitespace

    const left = (destValue.slice(0, startOffset) + textNormalized).trimLeft()
    const right = destValue.slice(endOffset).trimRight()
    const newValue = left + right

    const offset = getTextContentFromHTML(left).length

    return reducerFlow([

      existingThoughtChange({
        oldValue: destValue,
        newValue,
        context: rootedParentOf(state, pathToContext(path)),
        path: simplePath,
      }),

      !preventSetCursor && path ? setCursor({
        path: [...parentOf(path), { ...destThought, value: newValue }],
        offset,
      }) : null,

    ])(state)

  }
  else {

    // Closed incomplete tags, preserve only allowed tags and attributes and decode the html.
    const sanitizedConvertedText = unescape(sanitize(convertedText, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: ALLOWED_ATTRIBUTES,
      disallowedTagsMode: 'recursiveEscape'
    }))

    const json = isRoam ? roamJsonToBlocks(JSON.parse(sanitizedConvertedText)) : convertHTMLtoJSON(sanitizedConvertedText)

    const uuid = createId()

    const isDestContextEmpty = getAllChildren(state, context).length === 0

    /** Check if destination's parent context has more than one children. */
    const isDestParentContextEmpty = () => getAllChildren(state, rootedParentOf(state, context)).length <= 1

    const destEmpty = destThought.value === '' && isDestContextEmpty

    const shouldImportIntoDummy = destEmpty ? !isDestParentContextEmpty() : !isDestContextEmpty

    // Note: Create a dummy thought and then import new thoughts into its context and then collpase it . Since collapse uses existingThoughtMove it merges imported thoughts.
    const updatedState = shouldImportIntoDummy ? newThought(state, {
      at: simplePath,
      insertNewSubthought: true,
      value: uuid
    }) : state

    /**
     * Returns destination path.
     */
    const getDestinationPath = () => {
      if (!shouldImportIntoDummy) return simplePath
      const newDummyThought = getAllChildren(updatedState, context).find(child => child.value === uuid)
      return (newDummyThought ? [...simplePath, newDummyThought] : simplePath) as SimplePath
    }

    const newDestinationPath = getDestinationPath()

    const imported = importJSON(updatedState, newDestinationPath, json, { lastUpdated, skipRoot })

    /** Set cursor to the last imported path. */
    const setLastImportedCursor = (state: State) => {

      const lastImportedContext = pathToContext(imported.lastImported)

      /** Get last iumported cursor after using collapse. */
      const getLastImportedAfterCollapse = () => {
        const cursorContextHead = lastImportedContext.slice(0, newDestinationPath.length - (destEmpty ? 2 : 1))
        const cursorContextTail = lastImportedContext.slice(newDestinationPath.length)
        return [...cursorContextHead, ...cursorContextTail]
      }

      const newCursor = rankThoughtsFirstMatch(state, shouldImportIntoDummy ? getLastImportedAfterCollapse() : lastImportedContext)

      return setCursor(state, {
        path: newCursor,
      })
    }

    const parentOfDestination = parentOf(newDestinationPath)

    return reducerFlow([
      updateThoughts(imported),
      // set cusor to destination path's parent after collapse unless it's em or cusor set is prevented.
      shouldImportIntoDummy ? collapseContext({ deleteCursor: true, at: newDestinationPath }) : null,
      // if original destination has empty then collapse once more.
      shouldImportIntoDummy && destEmpty ?
        collapseContext({ deleteCursor: true, at: parentOfDestination }) : null,
      // restore the selection to the last imported thought on the first level
      // Note: Since collapseContext behavior sets cursor to the first children, we need to set cursor back to the old cursor if preventSetCursor is true.
      !preventSetCursor ? setLastImportedCursor : setCursor({
        path: state.cursor
      })
    ])(updatedState)
  }
}

export default _.curryRight(importText)
