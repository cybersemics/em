import _ from 'lodash'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import createThought from '../reducers/createThought'
import editThought from '../reducers/editThought'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getPrevRank from '../selectors/getPrevRank'
import head from '../util/head'

/** Sets the value of the first subthought in the given context. */
const setFirstSubthoughts = (state: State, { path, value }: { path: Path; value: string }) => {
  const id = head(path)
  const firstThoughtOld = getAllChildrenAsThoughts(state, id)[0]

  if (!path) {
    console.info({ context, value })
    throw new Error('Cannot setFirstSubthoughts on non-existent Path')
  }

  return firstThoughtOld
    ? // context has a first and must be changed
      editThought(state, {
        oldValue: firstThoughtOld.value,
        newValue: value,
        path: path.concat(firstThoughtOld.id) as SimplePath,
      })
    : // context is empty and so first thought must be created
      // assume context exists
      createThought(state, {
        path,
        value,
        rank: path ? getPrevRank(state, head(path)) : 0,
      })
}

export default _.curryRight(setFirstSubthoughts)
