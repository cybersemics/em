// selectors
import {
  getPrevRank,
  getThoughts,
  rankThoughtsFirstMatch,
} from '../selectors'

// reducers
import existingThoughtChange from './existingThoughtChange'
import newThoughtSubmit from './newThoughtSubmit'

/** Sets the value of the first subthought in the given context. */
export default (state, { context, value }) => {

  const oldFirstThoughtRanked = getThoughts(state, context)[0]
  return oldFirstThoughtRanked
    // context has a first and must be changed
    ? existingThoughtChange(state, {
      context,
      oldValue: oldFirstThoughtRanked.value,
      newValue: value,
      thoughtsRanked: rankThoughtsFirstMatch(state, context).concat({
        value,
        rank: oldFirstThoughtRanked.rank,
        uuid: oldFirstThoughtRanked.uuid,
      }),
    })

    // context is empty and so first thought must be created
    // assume context exists
    : newThoughtSubmit(state, {
      context,
      value,
      rank: getPrevRank(state, context),
    })
}
