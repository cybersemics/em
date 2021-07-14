import _ from 'lodash'
import { Context, SimplePath, State } from '../@types'
import { editThought, createThought } from '../reducers'
import { getPrevRank, getAllChildren, rankThoughtsFirstMatch } from '../selectors'

/** Sets the value of the first subthought in the given context. */
const setFirstSubthoughts = (state: State, { context, value }: { context: Context; value: string }) => {
  const oldFirstThoughtRanked = getAllChildren(state, context)[0]
  return oldFirstThoughtRanked
    ? // context has a first and must be changed
      editThought(state, {
        context,
        oldValue: oldFirstThoughtRanked.value,
        newValue: value,
        path: rankThoughtsFirstMatch(state, context).concat({
          value,
          rank: oldFirstThoughtRanked.rank,
        }) as SimplePath,
      })
    : // context is empty and so first thought must be created
      // assume context exists
      createThought(state, {
        context,
        value,
        rank: getPrevRank(state, context),
      })
}

export default _.curryRight(setFirstSubthoughts)
