import { getPrevRank, getThoughts, rankThoughtsFirstMatch } from '../selectors'
import { existingThoughtChange, newThoughtSubmit } from '../reducers'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Sets the value of the first subthought in the given context. */
const setFirstSubthoughts = (state: State, { context, value }: { context: Context, value: string }) => {

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

export default setFirstSubthoughts
