// util
import {
  getPrevRank,
  getThoughts,
  rankThoughtsFirstMatch,
} from '../util.js'

// reducers
import existingThoughtChange from './existingThoughtChange'
import newThoughtSubmit from './newThoughtSubmit'

// SIDE EFFECTS: localStorage, syncRemote
export default (state, { context, value, local, remote }) => {

  const oldThoughtRanked = getThoughts(context, state.thoughtIndex, state.contextIndex)[0]

  return oldThoughtRanked

    ? existingThoughtChange(state, {
      context,
      oldValue: oldThoughtRanked.value,
      newValue: value,
      thoughtsRanked: rankThoughtsFirstMatch(context, { state }).concat({
        value,
        rank: oldThoughtRanked.rank,
      }),
      local,
      remote,
    })

    : newThoughtSubmit(state, {
      context,
      value,
      rank: getPrevRank(context, state.thoughtIndex, state.contextIndex),
    })
}
