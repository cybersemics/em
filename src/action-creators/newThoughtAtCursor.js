// action-creators

// constants
import {
  ROOT_TOKEN,
} from '../constants'

// util
import {
  asyncFocus,
  contextOf,
  headRank,
  headValue,
  pathToContext,
  perma,
} from '../util'

// selectors
import {
  getThoughtsRanked,
  lastThoughtsFromContextChain,
  splitChain,
} from '../selectors'

/** Inserts a new thought at the browser cursor, possibly splitting the cursor. */
export default () => (dispatch, getState) => {

  const state = getState()
  const { cursor } = state

  let value = '' // eslint-disable-line fp/no-let
  const offset = window.getSelection().focusOffset
  const thoughtsRanked = perma(() => lastThoughtsFromContextChain(state, splitChain(state, cursor)))

  const thoughts = pathToContext(thoughtsRanked())
  const context = thoughts.length > 1 ? contextOf(thoughts) : [ROOT_TOKEN]

  // split the value into left and right parts
  value = headValue(cursor)
  const valueLeft = value.slice(0, offset)
  const valueRight = value.slice(offset)
  const thoughtsRankedLeft = contextOf(thoughtsRanked()).concat({ value: valueLeft, rank: headRank(cursor) })

  dispatch({
    type: 'existingThoughtChange',
    oldValue: value,
    newValue: valueLeft,
    context,
    thoughtsRanked: thoughtsRanked()
  })

  // wait for split existingThoughtChange to update state
  // should be done reducer combination
  asyncFocus()
  setTimeout(() => {
    const { rankRight } = dispatch({ type: 'newThought',
      value: valueRight,
      at: thoughtsRankedLeft,
      // selection offset
      offset: 0
    })

    const thoughtsRankedRight = contextOf(thoughtsRanked()).concat({ value: valueRight, rank: rankRight })
    const children = getThoughtsRanked(state, thoughtsRankedLeft)

    children.forEach(child => {
      dispatch({
        type: 'existingThoughtMove',
        oldPath: thoughtsRankedLeft.concat(child),
        newPath: thoughtsRankedRight.concat(child)
      })
    })
  })
}
