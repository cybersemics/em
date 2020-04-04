// util
import {
  getPrevRank,
  getThoughts,
  rankThoughtsFirstMatch,
} from '../util'

// reducers
import existingThoughtChange from './existingThoughtChange'
import newThoughtSubmit from './newThoughtSubmit'

export default (state, { context, value, local, remote }) => {

  const oldFirstThoughtRanked = getThoughts(context, state.thoughtIndex, state.contextIndex)[0]
  return oldFirstThoughtRanked

    // context has a first and must be changed
    ? existingThoughtChange(state, {
      context,
      oldValue: oldFirstThoughtRanked.value,
      newValue: value,
      thoughtsRanked: rankThoughtsFirstMatch(context, { state }).concat({
        value,
        rank: oldFirstThoughtRanked.rank,
      }),
      local,
      remote,
    })

    // context is empty and so first thought must be created
    // assume context exists
    : newThoughtSubmit(state, {
      context,
      value,
      rank: getPrevRank(context, state.thoughtIndex, state.contextIndex),
    })
}
