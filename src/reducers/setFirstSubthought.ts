import _ from 'lodash'
import { contextToThoughtId, getPrevRank, contextToPath } from '../selectors'
import { head } from '../util'
import { editThought, createThought } from '../reducers'
import { Context, SimplePath, State } from '../@types'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Sets the value of the first subthought in the given context. */
const setFirstSubthoughts = (state: State, { context, value }: { context: Context; value: string }) => {
  const id = contextToThoughtId(state, context)
  const oldFirstThoughtRanked = getAllChildrenAsThoughts(state, id)[0]

  const path = contextToPath(state, context)

  return path && oldFirstThoughtRanked
    ? // context has a first and must be changed
      editThought(state, {
        context,
        oldValue: oldFirstThoughtRanked.value,
        newValue: value,
        path: path.concat(oldFirstThoughtRanked.id) as SimplePath,
      })
    : // context is empty and so first thought must be created
      // assume context exists
      createThought(state, {
        context,
        value,
        rank: path ? getPrevRank(state, head(path)) : 0,
      })
}

export default _.curryRight(setFirstSubthoughts)
