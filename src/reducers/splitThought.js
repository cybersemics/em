// action-creators

// constants
import {
  ROOT_TOKEN,
} from '../constants'

import xhtmlPurifier from 'xhtml-purifier'

// util
import {
  contextOf,
  headRank,
  headValue,
  pathToContext,
  reducerFlow,
  strip,
} from '../util'

// selectors
import {
  getThoughtAfter,
  getThoughtsRanked,
  lastThoughtsFromContextChain,
  splitChain,
} from '../selectors'

// reducers
import existingThoughtChange from './existingThoughtChange'
import existingThoughtMove from './existingThoughtMove'
import newThought from './newThought'
import render from './render'

/** Splits a thought into two thoughts.
 *
 * @param path     The path of the thought to split. Defaults to cursor.
 * @param offset   The index within the thought at which to split. Defaults to the browser selection offset.
 */
export default (state, { path, offset } = {}) => {

  path = path || state.cursor
  offset = offset || window.getSelection().focusOffset

  const thoughtsRanked = lastThoughtsFromContextChain(state, splitChain(state, path))

  const thoughts = pathToContext(thoughtsRanked)
  const context = thoughts.length > 1 ? contextOf(thoughts) : [ROOT_TOKEN]

  // split the value into left and right parts
  const value = headValue(path)

  /*
    Note: Splitting a value with formatting tags may cause splitted values to be dirty html string.
          So xhtmlPurifier takes badly formatted html, and returns a pretty printed valid XHTML string.
          Since xhtmlPurifier adds unwanted <p> tags too, so strip is used to remove such tags while preserving formatting tags.
          issue: https://github.com/cybersemics/em/issues/742
  */
  const valueLeft = strip(xhtmlPurifier.purify(value.slice(0, offset)), { preserveFormatting: true })
  const valueRight = strip(xhtmlPurifier.purify(value.slice(offset)), { preserveFormatting: true })
  const thoughtsRankedLeft = contextOf(thoughtsRanked).concat({ value: valueLeft, rank: headRank(path) })

  return reducerFlow([

    // set the thought's text to the left of the selection
    state => existingThoughtChange(state, {
      oldValue: value,
      newValue: valueLeft,
      context,
      thoughtsRanked
    }),

    // create a new thought with the text to the right of the selection
    state => newThought(state, {
      value: valueRight,
      at: thoughtsRankedLeft,
      // selection offset
      offset: 0
    }),

    // move children
    state => {
      const thoughtNew = getThoughtAfter(state, thoughtsRankedLeft)
      const thoughtsRankedRight = contextOf(thoughtsRanked).concat({ value: valueRight, rank: thoughtNew.rank })
      const children = getThoughtsRanked(state, thoughtsRankedLeft)

      return reducerFlow(children.map(child =>
        state => existingThoughtMove(state, {
          oldPath: thoughtsRankedLeft.concat(child),
          newPath: thoughtsRankedRight.concat(child)
        })
      ))(state)
    },

    // render
    render,

  ])(state)
}
