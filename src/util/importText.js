import * as htmlparser from 'htmlparser2'
import he from 'he'
import { store } from '../store.js'
import {
  EM_TOKEN,
  ROOT_TOKEN,
} from '../constants.js'

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
  restoreSelection,
  rootedContextOf,
  strip,
  sync,
  timestamp,
} from '../util.js'

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
  const importCursor = equalPath(thoughtsRanked, [{ value: EM_TOKEN, rank: 0 }])
    ? thoughtsRanked
    : contextOf(thoughtsRanked)
  const thoughtIndexUpdates = {}
  const contextIndexUpdates = {}
  const context = pathToContext(contextOf(thoughtsRanked))
  const destThought = head(thoughtsRanked)
  const destValue = destThought.value
  const destRank = destThought.rank
  const destEmpty = destValue === '' && getThoughtsRanked(thoughtsRanked).length === 0
  const state = store.getState()
  const thoughtIndex = Object.assign({}, state.thoughtIndex)

  // if we are only importing a single line of text, then simply modify the current thought
  if (numLines === 1) {
    const focusOffset = window.getSelection().focusOffset
    const newText = (destValue !== '' ? ' ' : '') + strip(text)
    const selectedText = window.getSelection().toString()

    const newValue = destValue.slice(0, focusOffset) + newText + destValue.slice(focusOffset + selectedText.length)

    store.dispatch({
      type: 'existingThoughtChange',
      oldValue: destValue,
      newValue,
      context: rootedContextOf(pathToContext(thoughtsRanked)),
      thoughtsRanked
    })

    if (!preventSync) {
      setTimeout(() => {
        restoreSelection(contextOf(thoughtsRanked).concat({ value: newValue, rank: destRank }), { offset: focusOffset + newText.length })
      })
    }
  }
  else {

    // keep track of the last thought of the first level, as this is where the selection will be restored to
    let lastThoughtFirstLevel = thoughtsRanked // eslint-disable-line fp/no-let

    // if the thought where we are pasting is empty, replace it instead of adding to it
    if (destEmpty) {
      thoughtIndexUpdates[''] = getThought('', thoughtIndex) && getThought('', thoughtIndex).contexts && getThought('', thoughtIndex).contexts.length > 1
        ? removeContext(getThought('', thoughtIndex), context, headRank(thoughtsRanked))
        : null
      const contextEncoded = hashContext(rootedContextOf(thoughtsRanked))
      contextIndexUpdates[contextEncoded] = (state.contextIndex[contextEncoded] || [])
        .filter(child => !equalThoughtRanked(child, destThought))
    }

    // paste after last child of current thought
    let rank = getRankAfter(thoughtsRanked) // eslint-disable-line fp/no-let
    const next = nextSibling(destValue, context, destRank)
    const rankIncrement = next ? (next.rank - rank) / numLines : 1
    let lastValue // eslint-disable-line fp/no-let

    const parser = new htmlparser.Parser({
      onopentag: tagname => {
        // when there is a nested list, add an thought to the cursor so that the next thought will be added in the last thought's context
        // the thought is empty until the text is parsed
        if (lastValue && (tagname === 'ul' || tagname === 'ol')) {
          importCursor.push({ value: lastValue, rank }) // eslint-disable-line fp/no-mutating-methods
        }
      },
      ontext: text => {
        const value = text.trim()
        if (value.length > 0) {

          const context = importCursor.length > 0
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
          contextIndexUpdates[contextEncoded] = contextIndexUpdates[contextEncoded] || state.contextIndex[contextEncoded] || []
          contextIndexUpdates[contextEncoded].push({ // eslint-disable-line fp/no-mutating-methods
            value,
            rank,
            lastUpdated: timestamp()
          })

          // update lastValue and increment rank for next iteration
          lastValue = value
          rank += rankIncrement
        }
      },
      onclosetag: tagname => {
        if (tagname === 'ul' || tagname === 'ol') {
          importCursor.pop() // eslint-disable-line fp/no-mutating-methods
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
          if (lastThoughtFirstLevel) {
            restoreSelection(
              contextOf(thoughtsRanked).concat(lastThoughtFirstLevel),
              { offset: lastThoughtFirstLevel.value.length }
            )
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
