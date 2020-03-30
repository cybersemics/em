// util
import {
  getPrevRank,
  getThoughts,
  rankThoughtsFirstMatch,
} from '../util.js'

// action-creators
import newThoughtSubmit from './newThoughtSubmit'

export default ({ context, value, local, remote }) => (dispatch, getState) => {

  const state = getState()

  const oldFirstThoughtRanked = getThoughts(context, state.thoughtIndex, state.contextIndex)[0]

  return dispatch(oldFirstThoughtRanked

    // context has a first and must be changed
    ? {
      type: 'existingThoughtChange',
      context,
      oldValue: oldFirstThoughtRanked.value,
      newValue: value,
      thoughtsRanked: rankThoughtsFirstMatch(context, { state }).concat({
        value,
        rank: oldFirstThoughtRanked.rank,
      }),
      local,
      remote,
    }

    // context is empty and so first thought must be created
    // assume context exists
    : newThoughtSubmit({
      context,
      value,
      rank: getPrevRank(context, state.thoughtIndex, state.contextIndex),
    })
  )
}
