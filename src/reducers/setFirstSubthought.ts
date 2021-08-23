import _, { once } from 'lodash'
import { getPrevRank, rankThoughtsFirstMatch } from '../selectors'
import { editThought, createThought } from '../reducers'
import { Context, SimplePath, State } from '../@types'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Sets the value of the first subthought in the given context. */
const setFirstSubthoughts = (state: State, { context, value }: { context: Context; value: string }) => {
  const oldFirstThoughtRanked = getAllChildrenAsThoughts(state, context)[0]

  const getFirstMatchedPath = once(() => rankThoughtsFirstMatch(state, context))

  return oldFirstThoughtRanked
    ? // context has a first and must be changed
      editThought(state, {
        context,
        oldValue: oldFirstThoughtRanked.value,
        newValue: value,
        path: getFirstMatchedPath().concat(oldFirstThoughtRanked.id) as SimplePath,
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
