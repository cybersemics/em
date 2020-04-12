import * as htmlparser from 'htmlparser2'
import he from 'he'
import { store } from '../store'
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
  strip,
  sync,
  timestamp,
} from '../util'

// selectors
import { getRankAfter, getThought, nextSibling } from '../selectors'
import getThoughtsRanked from '../selectors/getThoughtsRanked'

/** Imports the given text or html into the given thoughts */
export const importText = (thoughtsRanked, inputText, { preventSync } = {}) => {

  const decodedInputText = he.decode(inputText)

  const hasLines = /<li|p>.*<\/li|p>/mi.test(inputText)

  // true plaintext won't have any <li>'s or <p>'s
  // transform newlines in plaintext into <li>'s
  const text = !hasLines
    ? decodedInputText
      .split('\n')
      .filter(s => s.trim())
      .map(line => `<li>${line}</li>`)
      .join('')
    // if it's an entire HTML page, ignore everything outside the body tags
    : decodedInputText.replace(/[\s\S]*<body>([\s\S]+?)<\/body>[\s\S]*/gmi, (input, bodyContent) => bodyContent)

  const numLines = (text.match(/<li>/gmi) || []).length

  // allow importing directly into em context
  const state = store.getState()
  const importCursor = equalPath(thoughtsRanked, [{ value: EM_TOKEN, rank: 0 }])
    ? thoughtsRanked
    : contextOf(thoughtsRanked)
  const thoughtIndexUpdates = {}
  const contextIndexUpdates = {}
  const context = pathToContext(contextOf(thoughtsRanked))
  const destThought = head(thoughtsRanked)
  const destValue = destThought.value
  const destRank = destThought.rank
  const destEmpty = destValue === '' && getThoughtsRanked(state, thoughtsRanked).length === 0
  const thoughtIndex = Object.assign({}, state.thoughtIndex)

  // if we are only importing a single line of text, then simply modify the current thought
  if (numLines === 1) {
    const focusOffset = window.getSelection().focusOffset
    const newText = (destValue !== '' ? ' ' : '') + strip(text, { preserveFormatting: true })
    const selectedText = window.getSelection().toString()

    const newValue = destValue.slice(0, focusOffset) + newText + destValue.slice(focusOffset + selectedText.length)

    store.dispatch({
      type: 'existingThoughtChange',
      oldValue: destValue,
      newValue,
      context: rootedContextOf(pathToContext(thoughtsRanked)),
      thoughtsRanked
    })

    if (thoughtsRanked) {
      store.dispatch({
        type: 'setCursor',
        thoughtsRanked: contextOf(thoughtsRanked).concat({ value: newValue, rank: destRank }),
        offset: focusOffset + newText.length
      })
    }
  }
  else {

    // keep track of the last thought of the first level, as this is where the selection will be restored to
    let lastThoughtFirstLevel = thoughtsRanked // eslint-disable-line fp/no-let

    // if the thought where we are pasting is empty, replace it instead of adding to it
    if (destEmpty) {
      thoughtIndexUpdates[hashThought('')] =
        getThought(state, '') &&
        getThought(state, '').contexts &&
        getThought(state, '').contexts.length > 1
          ? removeContext(getThought(state, ''), context, headRank(thoughtsRanked))
          : null
      const contextEncoded = hashContext(rootedContextOf(thoughtsRanked))
      contextIndexUpdates[contextEncoded] = (state.contextIndex[contextEncoded] || [])
        .filter(child => !equalThoughtRanked(child, destThought))
    }

    // paste after last child of current thought
    let rank = getRankAfter(state, thoughtsRanked) // eslint-disable-line fp/no-let
    const next = nextSibling(state, destValue, context, destRank)
    const rankIncrement = next ? (next.rank - rank) / numLines : 1
    let lastValue // eslint-disable-line fp/no-let

    // import notes from WorkFlowy
    let insertAsNote = false // eslint-disable-line fp/no-let

    const parser = new htmlparser.Parser({
      onopentag: (tagname, attributes) => {
        // when there is a nested list, add the last thought to the cursor so that the next imported thought will be added in the last thought's context. The thought is empty until the text is parsed.
        // lastValue is also used during ontext to know if a note is being inserted
        if (lastValue && (tagname === 'ul' || tagname === 'ol')) {
          importCursor.push({ value: lastValue, rank }) // eslint-disable-line fp/no-mutating-methods
        }

        if (attributes.class === 'note') {
          insertAsNote = true
        }
      },
      ontext: text => {

        const valueOriginal = text.trim()

        if (valueOriginal.length === 0) return

        // a value that can masquerade as a note
        const value = insertAsNote ? '=note' : valueOriginal

        const context = importCursor.length > 0
          ? pathToContext(importCursor).concat(insertAsNote ? lastValue : [])
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
        contextIndexUpdates[contextEncoded] = contextIndexUpdates[contextEncoded] || state.contextIndex[contextEncoded] || []
        contextIndexUpdates[contextEncoded].push({ // eslint-disable-line fp/no-mutating-methods
          value,
          rank,
          lastUpdated: timestamp()
        })

        // add note to new thought
        if (insertAsNote) {

          const contextNote = context.concat(value)
          const valueNote = valueOriginal

          const thoughtNote = addThought({
            thoughtIndex,
            value: valueNote,
            rank: 0,
            context: contextNote
          })

          thoughtIndex[hashThought(valueNote)] = thoughtNote
          thoughtIndexUpdates[hashThought(valueNote)] = thoughtNote

          // update contextIndexUpdates
          const contextEncoded = hashContext(contextNote)
          contextIndexUpdates[contextEncoded] = contextIndexUpdates[contextEncoded] || state.contextIndex[contextEncoded] || []
          contextIndexUpdates[contextEncoded].push({ // eslint-disable-line fp/no-mutating-methods
            value: valueNote,
            rank: 0,
            lastUpdated: timestamp()
          })
        }
        // only update lastValue for non-notes. Otherwise the next thought will incorrectly be added to the note and not the thought itself.
        else {
          // update lastValue and increment rank for next iteration
          lastValue = value
          rank += rankIncrement
        }
      },
      onclosetag: tagname => {
        if (tagname === 'ul' || tagname === 'ol') {
          importCursor.pop() // eslint-disable-line fp/no-mutating-methods
        }
        // reset insertAsNote
        else if (insertAsNote) {
          insertAsNote = false
        }
      }
    })

    parser.write(text)
    parser.end()

    if (!preventSync) {
      sync(thoughtIndexUpdates, contextIndexUpdates, {
        forceRender: true,
        callback: () => {
          // restore the selection to the first imported thought
          if (lastThoughtFirstLevel && lastThoughtFirstLevel.value) {
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
      thoughtIndexUpdates,
      contextIndexUpdates
    })
  }

  return Promise.resolve({})
}
