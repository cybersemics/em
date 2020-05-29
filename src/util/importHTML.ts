import * as htmlparser from 'htmlparser2'
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
  hashContext,
  hashThought,
  head,
  headRank,
  pathToContext,
  removeContext,
  rootedContextOf,
  timestamp,
  unroot,
} from '../util'

// selectors
import {
  getRankAfter,
  getThought,
  getThoughtsRanked,
  nextSibling,
} from '../selectors'
import { Path } from '../types'
import { InitialStateInterface } from './initialState'

// a list item tag
const regexpListItem = /<li(?:\s|>)/gmi

/** Returns true if the given tagname is ul or ol. */
const isList = (tagname: string) => tagname === 'ul' || tagname === 'ol'

/** Returns true if the given tagname is li or p. */
const isListItem = (tagname: string) => tagname === 'li' || tagname === 'p'

/** Returns true if the given tagname is i, b, or u. */
const isFormattingTag = (tagname: string) => tagname === 'i' || tagname === 'b' || tagname === 'u'

interface importHtmlOptions {
  skipRoot: boolean,
  state: InitialStateInterface
}
interface insertThoughtOptions { 
  indent?: boolean, 
  outdent?: boolean, 
  insertEmpty?: boolean 
}
/**
 * Parses HTML and generates { contextIndexUpdates, thoughtIndexUpdates } that can be sync'd to state.
 *
 * @param skipRoot Instead of importing the root into the importCursor, skip it and import all its children.
 */
export const importHtml = (thoughtsRanked: Path, html: string, { skipRoot, state }: importHtmlOptions = {skipRoot: false, state: store.getState()}) => {

  /***********************************************
   * Constants
   ***********************************************/

  // allow importing directly into em context
  const numLines = (html.match(regexpListItem) || []).length
  const destThought = head(thoughtsRanked)
  const destValue = destThought.value
  const destRank = destThought.rank
  const thoughtIndexUpdates: InitialStateInterface["thoughts"]["thoughtIndex"] = {}
  const contextIndexUpdates: InitialStateInterface["thoughts"]["contextIndex"] = {}
  const context = pathToContext(contextOf(thoughtsRanked))
  const destEmpty = destValue === '' && getThoughtsRanked(state, thoughtsRanked).length === 0
  const contextIndex = { ...state.thoughts.contextIndex }
  const thoughtIndex = { ...state.thoughts.thoughtIndex }
  const rankStart = getRankAfter(state, thoughtsRanked)
  const next = nextSibling(state, destValue, context, destRank) // paste after last child of current thought
  const rankIncrement = next ? (next.rank - rankStart) / (numLines || 1) : 1 // prevent divide by zero

  // should be of type Child
  // keep track of the last thought of the first level, as this is where the selection will be restored to
  let lastThoughtFirstLevel = thoughtsRanked // eslint-disable-line fp/no-let

  // if the thought where we are pasting is empty, replace it instead of adding to it
  if (destEmpty) {
    const thought = getThought(state, '')
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
  const importCursor: Path = equalPath(thoughtsRanked, [{ value: EM_TOKEN, rank: 0 }])
    ? [...thoughtsRanked] // clone thoughtsRanked since importCursor is modified
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

  /** Returns true if the import cursor is still at the starting level. */
  const importCursorAtStart = () =>
    unroot(importCursor).length === unroot(thoughtsRanked).length

  /** Insert the accumulated value at the importCursor. Reset and advance rank afterwards. Modifies contextIndex and thoughtIndex. */
  const flushThought = (options?: insertThoughtOptions) => {

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
  const insertThought = (value: string, { indent, outdent, insertEmpty }: insertThoughtOptions = {}) => {

    value = value.trim()

    if (!value && !insertEmpty) return

    const context = importCursor.length > 0
      // ? pathToContext(importCursor).concat(isNote ? value : [])
      ? pathToContext(importCursor)
      : [ROOT_TOKEN]

    // increment rank regardless of depth
    // ranks will not be sequential, but they will be sorted since the parser is in order
    const thoughtNew = addThought(
      state,
      value,
      rank,
      context
    )

    // save the first imported thought to restore the selection to
    if (importCursor.length === thoughtsRanked.length - 1) {
      //@ts-ignore
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
      // guard against going above the starting importCursor
      if (!importCursorAtStart()) {
        importCursor.pop() // eslint-disable-line fp/no-mutating-methods
      }
    }
  }

  /***********************************************
   * Parser
   ***********************************************/

  const parser = new htmlparser.Parser({

    onopentag: (tagname, attributes) => {

      // store the last isNote (see usage below)
      const isNotePrev = isNote

      isNote = attributes.class === 'note'

      // turn on note flag so that it can be detected when flushThought is called on onclosetag
      // the additional =note category is added in onclosetag
      if (isNote) {
        flushThought({ indent: true })
      }
      // add the accumulated thought and indent if it is a list
      // If valueAccum is empty and the previous thought was a note, do not add an empty thought. The thought was already added when the note was added, so the importCursor is already in the right place for the children.
      else if (isList(tagname) && (valueAccum.trim() || (!isNotePrev && !importCursorAtStart()))) {
        flushThought({ indent: true, insertEmpty: true })
      }
      // insert the formatting tag and turn on the format flag so the closing formatting tag can be inserted
      else if (isFormattingTag(tagname)) {
        valueAccum += `<${tagname}>`
      }
    },

    ontext: (text) => {
      // append text for the next thought
      valueAccum += text
    },

    //@ts-ignore The function signature is different from its respective library definition
    onclosetag: (tagname) => {

      // insert the note into a =note subthought with proper indentation
      if (isNote) {
        insertThought('=note', { indent: true })
        flushThought({ outdent: true })
      }
      // when a list ends, go up a level
      else if (isList(tagname)) {
        // guard against going above the starting importCursor
        if (!importCursorAtStart()) {
          importCursor.pop() // eslint-disable-line
        }
      }
      // when a list item is closed, add the thought
      // it may have already been added, e.g. if it was added in onopentag, before its children were added, in which case valueAccum will be empty and flushThought will exit without adding a thought
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
