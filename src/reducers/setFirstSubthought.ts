import _ from 'lodash'
import getPrevRank from '../selectors/getPrevRank'
import head from '../util/head'
import editThought from '../reducers/editThought'
import createThought from '../reducers/createThought'
import SimplePath from '../@types/SimplePath'
import Path from '../@types/Path'
import State from '../@types/State'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import thoughtToContext from '../selectors/thoughtToContext'

/** Sets the value of the first subthought in the given context. */
const setFirstSubthoughts = (state: State, { path, value }: { path: Path; value: string }) => {
  const id = head(path)
  const firstThoughtOld = getAllChildrenAsThoughts(state, id)[0]
  const context = thoughtToContext(state, id)

  if (!path) {
    console.info({ context, value })
    throw new Error('Cannot setFirstSubthoughts on non-existent Path')
  }

  return firstThoughtOld
    ? // context has a first and must be changed
      editThought(state, {
        context,
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
