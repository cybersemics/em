import _ from 'lodash'
import contextToThoughtId from '../selectors/contextToThoughtId'
import getPrevRank from '../selectors/getPrevRank'
import contextToPath from '../selectors/contextToPath'
import head from '../util/head'
import editThought from '../reducers/editThought'
import createThought from '../reducers/createThought'
import Context from '../@types/Context'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
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
