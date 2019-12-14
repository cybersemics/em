import * as htmlparser from 'htmlparser2'
import he from 'he'
import { store } from '../store.js'
import {
  ROOT_TOKEN,
} from '../constants.js'

// util
import { unrank } from './unrank.js'
import { encodeItems } from './encodeItems.js'
import { timestamp } from './timestamp.js'
import { equalItemRanked } from './equalItemRanked.js'
import { strip } from './strip.js'
import { signifier } from './signifier.js'
import { sigRank } from './sigRank.js'
import { contextOf } from './contextOf.js'
import { removeContext } from './removeContext.js'
import { rootedIntersections } from './rootedIntersections.js'
import { getChildrenWithRank } from './getChildrenWithRank.js'
import { getRankAfter } from './getRankAfter.js'
import { nextSibling } from './nextSibling.js'
import { restoreSelection } from './restoreSelection.js'
import { addItem } from './addItem.js'
import { sync } from './sync.js'
import { hashThought } from './hashThought.js'
import { getThought } from './getThought.js'

/** Imports the given text or html into the given items */
export const importText = (itemsRanked, inputText) => {

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

  const importCursor = contextOf(itemsRanked)
  const updates = {}
  const contextChildrenUpdates = {}
  const context = unrank(contextOf(itemsRanked))
  const destSig = signifier(itemsRanked)
  const destKey = destSig.key
  const destRank = destSig.rank
  const destEmpty = destKey === '' && getChildrenWithRank(itemsRanked).length === 0
  const state = store.getState()
  const data = Object.assign({}, state.data)

  // if we are only importing a single line of text, then simply modify the current thought
  if (numLines === 1) {
    const focusOffset = window.getSelection().focusOffset
    const newText = (destKey !== '' ? ' ' : '') + strip(text)
    const selectedText = window.getSelection().toString()

    const newValue = destKey.slice(0, focusOffset) + newText + destKey.slice(focusOffset + selectedText.length)

    store.dispatch({
      type: 'existingItemChange',
      oldValue: destKey,
      newValue,
      context: rootedIntersections(unrank(itemsRanked)),
      itemsRanked: itemsRanked
    })

    setTimeout(() => {
      restoreSelection(contextOf(itemsRanked).concat({ key: newValue, rank: destRank }), { offset: focusOffset + newText.length })
    })
  }
  else {

    // keep track of the last thought of the first level, as this is where the selection will be restored to
    let lastThoughtFirstLevel // eslint-disable-line fp/no-let

    // if the item where we are pasting is empty, replace it instead of adding to it
    if (destEmpty) {
      updates[''] = getThought('', data) && getThought('', data).memberOf && getThought('', data).memberOf.length > 1
        ? removeContext(getThought('', data), context, sigRank(itemsRanked))
        : null
      const contextEncoded = encodeItems(unrank(rootedIntersections(itemsRanked)))
      contextChildrenUpdates[contextEncoded] = (state.contextChildren[contextEncoded] || [])
        .filter(child => !equalItemRanked(child, destSig))
    }

    // paste after last child of current item
    let rank = getRankAfter(itemsRanked) // eslint-disable-line fp/no-let
    const next = nextSibling(itemsRanked)
    const rankIncrement = next ? (next.rank - rank) / numLines : 1
    let lastValue // eslint-disable-line fp/no-let

    const parser = new htmlparser.Parser({
      onopentag: tagname => {
        // when there is a nested list, add an item to the cursor so that the next item will be added in the last item's context
        // the item is empty until the text is parsed
        if (lastValue && (tagname === 'ul' || tagname === 'ol')) {
          importCursor.push({ key: lastValue, rank }) // eslint-disable-line fp/no-mutating-methods
        }
      },
      ontext: text => {
        const value = text.trim()
        if (value.length > 0) {

          const context = importCursor.length > 0 ? unrank(importCursor) : [ROOT_TOKEN]

          // increment rank regardless of depth
          // ranks will not be sequential, but they will be sorted since the parser is in order
          const itemNew = addItem({
            data,
            value,
            rank,
            context
          })

          // save the first imported item to restore the selection to
          if (importCursor.length === itemsRanked.length - 1) {
            lastThoughtFirstLevel = { key: value, rank }
          }

          // update data
          // keep track of individual updates separate from data for updating data sources
          data[hashThought(value)] = itemNew
          updates[hashThought(value)] = itemNew

          // update contextChildrenUpdates
          const contextEncoded = encodeItems(context)
          contextChildrenUpdates[contextEncoded] = contextChildrenUpdates[contextEncoded] || state.contextChildren[contextEncoded] || []
          contextChildrenUpdates[contextEncoded].push({ // eslint-disable-line fp/no-mutating-methods
            key: value,
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

    sync(updates, contextChildrenUpdates, {
      forceRender: true,
      callback: () => {
        // restore the selection to the first imported item
        restoreSelection(
          contextOf(itemsRanked).concat(lastThoughtFirstLevel),
          { offset: lastThoughtFirstLevel.key.length }
        )
      }
    })
  }
}
