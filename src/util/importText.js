import * as htmlparser from 'htmlparser2'
import { parse } from 'jex-block-parser'
import he from 'he'
import { store } from '../store'

// constants
import {
  EM_TOKEN,
  ROOT_TOKEN,
} from '../constants'

// util
import {
  addThought,
  contextOf,
  equalPath,
  equalThoughtRanked,
  getRankAfter,
  getThought,
  getThoughtsRanked,
  hashContext,
  hashThought,
  head,
  headRank,
  nextSibling,
  pathToContext,
  removeContext,
  rootedContextOf,
  strip,
  sync,
  timestamp,
} from '../util'

// starts with '-', '—' (emdash), ▪, ◦, •, or '*'' (excluding whitespace)
// '*'' must be followed by a whitespace character to avoid matching *footnotes or *markdown italic*
const regexpPlaintextBullet = /^\s*(?:[-—▪◦•]|\*\s)/m

// has at least one list item or paragraph
const regexpHasListItems = /<li|p(?:\s|>).*?>.*<\/li|p>/mi

// a list item tag
const regexpListItem = /<li(?:\s|>)/gmi

/** Returns true if the given tagname is ul or ol. */
const isList = tagname => tagname === 'ul' || tagname === 'ol'

/** Returns true if the given tagname is li or p */
const isListItem = tagname => tagname === 'li' || tagname === 'p'

/** Returns true if the given tagname is i, b, or u */
const isFormattingTag = tagname => tagname === 'i' || tagname === 'b' || tagname === 'u'

/** Converts data output from jex-block-parser into HTML

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
const blocksToHtml = parsedBlocks =>
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
const bodyContent = html => {
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

/* Parser plaintext, indentend text, or HTML into HTML that htmlparser can understand */
const rawTextToHtml = inputText => {

  // if the input text has any <li> elements at all, treat it as HTML
  const isHTML = regexpHasListItems.test(inputText)
  const decodedInputText = he.decode(inputText)

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
    : bodyContent(inputText)
}

/* Parse HTML and generates { contextIndexUpdates, thoughtIndexUpdates } that can be sync'd to state
  @param skipRoot    Instead of importing the root into the importCursor, skip it and import all its children.
*/
export const importHtml = (thoughtsRanked, html, { skipRoot, state } = {}) => {

  /***********************************************
   * Constants
   ***********************************************/

  state = state || store.getState()
  const numLines = (html.match(regexpListItem) || []).length
  const destThought = head(thoughtsRanked)
  const destValue = destThought.value
  const destRank = destThought.rank
  const thoughtIndexUpdates = {}
  const contextIndexUpdates = {}
  const context = pathToContext(contextOf(thoughtsRanked))
  const destEmpty = destValue === '' && getThoughtsRanked(thoughtsRanked).length === 0
  const contextIndex = { ...state.contextIndex }
  const thoughtIndex = { ...state.thoughtIndex }
  const rankStart = getRankAfter(thoughtsRanked)
  const next = nextSibling(destValue, context, destRank) // paste after last child of current thought
  const rankIncrement = next ? (next.rank - rankStart) / (numLines || 1) : 1 // prevent divide by zero

  // keep track of the last thought of the first level, as this is where the selection will be restored to
  let lastThoughtFirstLevel = thoughtsRanked // eslint-disable-line fp/no-let

  // if the thought where we are pasting is empty, replace it instead of adding to it
  if (destEmpty) {
    const thought = getThought('', thoughtIndex)
    thoughtIndexUpdates[hashThought('')] =
      thought &&
      thought.contexts &&
      thought.contexts.length > 1
        ? removeContext(thought, context, headRank(thoughtsRanked))
        : null
    const contextEncoded = hashContext(rootedContextOf(thoughtsRanked))
    contextIndexUpdates[contextEncoded] = (contextIndex[contextEncoded] || [])
      .filter(child => !equalThoughtRanked(child, destThought))
  }

  /***********************************************
   * Variables
   ***********************************************/

  // modified during parsing
  const importCursor = equalPath(thoughtsRanked, [{ value: EM_TOKEN, rank: 0 }])
    ? thoughtsRanked
    : contextOf(thoughtsRanked)

  // the value may accumulate over several tags, e.g. <b>one</b> and <i>two</i>
  let valueAccum = '' // eslint-disable-line fp/no-let

  // the rank will increment by rankIncrement each thought
  let rank = rankStart // eslint-disable-line fp/no-let

  // import notes from WorkFlowy
  let isNote = false // eslint-disable-line fp/no-let

  // when skipRoot is true, keep track if the root has been skipped
  let rootSkipped = false // eslint-disable-line fp/no-let

  /***********************************************
   * Methods
   ***********************************************/

  /** Insert the accumulated value at the importCursor. Reset and advance rank afterwards. Modifies contextIndex and thoughtIndex. */
  const flushThought = options => {

    // do not insert the first thought if skipRoot
    if (skipRoot && !rootSkipped) {
      rootSkipped = true
    }
    // insert thought with accumulated text
    else {
      insertThought(valueAccum, options)
      rank += rankIncrement
    }

    valueAccum = ''
  }

  /** Insert the given value at the importCursor. Modifies contextIndex and thoughtIndex. */
  const insertThought = (value, { indent, outdent } = {}) => {

    value = value.trim()

    if (!value) return

    const context = importCursor.length > 0
      // ? pathToContext(importCursor).concat(isNote ? value : [])
      ? pathToContext(importCursor)
      : [ROOT_TOKEN]

    // increment rank regardless of depth
    // ranks will not be sequential, but they will be sorted since the parser is in order
    const thoughtNew = addThought({
      thoughtIndex,
      value,
      rank,
      context
    })

    // save the first imported thought to restore the selection to
    if (importCursor.length === thoughtsRanked.length - 1) {
      lastThoughtFirstLevel = { value, rank }
    }

    // update thoughtIndex
    // keep track of individual thoughtIndexUpdates separate from thoughtIndex for updating thoughtIndex sources
    thoughtIndex[hashThought(value)] = thoughtNew
    thoughtIndexUpdates[hashThought(value)] = thoughtNew

    // update contextIndexUpdates
    const contextEncoded = hashContext(context)
    contextIndexUpdates[contextEncoded] = (contextIndexUpdates[contextEncoded] || contextIndex[contextEncoded] || []).slice()
    contextIndexUpdates[contextEncoded].push({ // eslint-disable-line fp/no-mutating-methods
      value,
      rank,
      lastUpdated: timestamp()
    })

    // indent or outdent
    if (indent) {
      importCursor.push({ value, rank }) // eslint-disable-line fp/no-mutating-methods
    }
    else if (outdent) {
      importCursor.pop() // eslint-disable-line fp/no-mutating-methods
    }
  }

  /***********************************************
   * Parser
   ***********************************************/

  const parser = new htmlparser.Parser({

    onopentag: (tagname, attributes) => {

      // turn on note flag so that it can be detected when flushThought is called on onclosetag
      // the additional =note category is added in onclosetag
      if (attributes.class === 'note') {
        flushThought({ indent: true })
        isNote = true
      }
      // add the accumulated thought and indent if it is a list
      else if (isList(tagname) && valueAccum.trim()) {
        flushThought({ indent: true })
      }
      // insert the formatting tag and turn on the format flag so the closing formatting tag can be inserted
      else if (isFormattingTag(tagname)) {
        valueAccum += `<${tagname}>`
      }
    },

    ontext: text => {
      // append text for the next thought
      valueAccum += text
    },

    onclosetag: tagname => {

      // insert the note into a =note subthought with proper indentation
      if (isNote) {
        insertThought('=note', { indent: true })
        flushThought({ outdent: true })
        isNote = false
      }
      // when a list ends, go up a level
      else if (isList(tagname)) {
        importCursor.pop() // eslint-disable-line
      }
      // when a list item is closed, add the thought
      // it may have already been added, e.g. if it was added before its children, in which case valueAccum will be empty and flushThought will exit without adding a thought
      else if (isListItem(tagname)) {
        flushThought()
      }
      // add the closing formatting tag
      else if (isFormattingTag(tagname)) {
        valueAccum += `</${tagname}>`
      }
    }

  })

  parser.write(html)
  parser.end()

  if (valueAccum) {
    flushThought()
  }

  return {
    contextIndexUpdates,
    lastThoughtFirstLevel,
    thoughtIndexUpdates,
  }
}

/** Imports the given text or html into the given thoughts
  @param preventSetCursor  Prevents the default behavior of setting the cursor to the last thought at the first level
  @param preventSync       Prevent syncing state, turning this into a pure function.
  @param rawDestValue      When pasting after whitespace, e.g. pasting "b" after "a ", the normal destValue has already been trimmed, which would result in "ab". We need to pass the untrimmed destination value in so that it can be trimmed after concatenation.
  @param skipRoot          See importHtml @param.
*/
export const importText = (thoughtsRanked, inputText, { preventSetCursor, preventSync, rawDestValue, skipRoot } = {}) => {
  const text = rawTextToHtml(inputText)
  const numLines = (text.match(regexpListItem) || []).length
  const destThought = head(thoughtsRanked)
  const destValue = rawDestValue || destThought.value
  const destRank = destThought.rank

  // if we are only importing a single line of text, then simply modify the current thought
  if (numLines === 1) {

    const newText = strip(text, { preserveFormatting: true })

    // get the range if there is one so that we can import over the selected text
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

    store.dispatch({
      type: 'existingThoughtChange',
      oldValue: destValue,
      newValue,
      context: rootedContextOf(pathToContext(thoughtsRanked)),
      thoughtsRanked
    })

    if (!preventSetCursor && thoughtsRanked) {
      store.dispatch({
        type: 'setCursor',
        thoughtsRanked: contextOf(thoughtsRanked).concat({ value: newValue, rank: destRank }),
        offset: startOffset + newText.length
      })
    }
  }
  else {

    const { lastThoughtFirstLevel, thoughtIndexUpdates, contextIndexUpdates } = importHtml(thoughtsRanked, text, { skipRoot })

    if (!preventSync) {
      sync(thoughtIndexUpdates, contextIndexUpdates, {
        forceRender: true,
        callback: () => {
          // restore the selection to the first imported thought
          if (!preventSetCursor && lastThoughtFirstLevel && lastThoughtFirstLevel.value) {
            store.dispatch({
              type: 'setCursor',
              thoughtsRanked: contextOf(thoughtsRanked).concat(lastThoughtFirstLevel),
              offset: lastThoughtFirstLevel.value.length
            })
          }
        }
      })
    }

    return Promise.resolve({
      contextIndexUpdates,
      thoughtIndexUpdates,
    })
  }

  return Promise.resolve({})
}
