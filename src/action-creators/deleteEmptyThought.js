// constants
import {
  ROOT_TOKEN,
} from '../constants'

// util
import {
  contextOf,
  deleteThought,
  head,
  headRank,
  headValue,
  isDivider,
  pathToContext,
  rootedContextOf,
} from '../util'

// selectors
import {
  getNextRank,
  getThoughtsRanked,
  isContextViewActive,
  lastThoughtsFromContextChain,
  prevSibling,
  splitChain,
} from '../selectors'

export default () => (dispatch, getState) => {
  const state = getState()
  const { cursor, editing } = state
  const offset = window.getSelection().focusOffset

  if (cursor) {
    const showContexts = isContextViewActive(state, contextOf(cursor))
    const contextChain = splitChain(state, cursor)
    const thoughtsRanked = lastThoughtsFromContextChain(state, contextChain)
    const children = getThoughtsRanked(state, thoughtsRanked)

    if ((headValue(cursor) === '' && children.length === 0) || isDivider(headValue(cursor))) {
      deleteThought()
    }
    else if (offset === 0 && !showContexts) {
      const value = headValue(cursor)
      const rank = headRank(cursor)
      const thoughts = pathToContext(thoughtsRanked)
      const context = thoughts.length > 1 ? contextOf(thoughts) : [ROOT_TOKEN]
      const prev = prevSibling(state, value, rootedContextOf(cursor), rank)

      if (prev) {

        const valueNew = prev.value + value
        const thoughtsRankedPrevNew = contextOf(thoughtsRanked).concat({
          value: valueNew,
          rank: prev.rank
        })

        dispatch({
          type: 'existingThoughtChange',
          oldValue: prev.value,
          newValue: valueNew,
          context,
          thoughtsRanked: contextOf(thoughtsRanked).concat(prev)
        })

        const nextRank = getNextRank(state, thoughtsRankedPrevNew)

        // merge children into merged thought
        children.forEach((child, i) => {
          dispatch({
            type: 'existingThoughtMove',
            oldPath: thoughtsRanked.concat(child),
            newPath: thoughtsRankedPrevNew.concat({ ...child, rank: nextRank + i })
          })
        })

        dispatch({
          type: 'existingThoughtDelete',
          context,
          thoughtRanked: head(thoughtsRanked)
        })

        dispatch({
          type: 'setCursor',
          thoughtsRanked: thoughtsRankedPrevNew,
          offset: prev.value.length,
          editing
        })
      }
    }
  }
}
