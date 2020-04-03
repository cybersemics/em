// constants
import {
  ROOT_TOKEN,
} from '../constants'

// util
import {
  contextOf,
  deleteThought,
  getNextRank,
  head,
  headRank,
  headValue,
  isContextViewActive,
  isDivider,
  lastThoughtsFromContextChain,
  pathToContext,
  prevSibling,
  rootedContextOf,
  splitChain,
} from '../util'

// selectors
import getThoughtsRanked from '../selectors/getThoughtsRanked'

export const deleteEmptyThought = () => (dispatch, getState) => {
  const state = getState()
  const { cursor, contextViews, editing } = state
  const offset = window.getSelection().focusOffset

  if (cursor) {
    const showContexts = isContextViewActive(contextOf(cursor), { state })
    const contextChain = splitChain(cursor, contextViews)
    const thoughtsRanked = lastThoughtsFromContextChain(contextChain)
    const children = getThoughtsRanked(state, thoughtsRanked)

    if ((headValue(cursor) === '' && children.length === 0) || isDivider(headValue(cursor))) {
      deleteThought()
    }
    else if (offset === 0 && !showContexts) {
      const value = headValue(cursor)
      const rank = headRank(cursor)
      const thoughts = pathToContext(thoughtsRanked)
      const context = thoughts.length > 1 ? contextOf(thoughts) : [ROOT_TOKEN]
      const prev = prevSibling(value, rootedContextOf(cursor), rank)

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

        const nextRank = getNextRank(thoughtsRankedPrevNew)

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
