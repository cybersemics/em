import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import createThought from '../actions/createThought'
import editThought from '../actions/editThought'
import { anyChild } from '../selectors/getChildren'
import getPrevRank from '../selectors/getPrevRank'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import headId from '../util/headId'

/** Sets the value of the first subthought in the given context. */
const setFirstSubthought = (state: State, { path, value }: { path: Path; value: string }) => {
  const id = headId(path)
  const firstThoughtOld = anyChild(state, id)

  if (!path) {
    console.info({ path, value })
    throw new Error('Cannot setFirstSubthought on non-existent Path')
  }

  return firstThoughtOld
    ? // context has a first and must be changed
      editThought(state, {
        oldValue: firstThoughtOld.value,
        newValue: value,
        path: appendToPath(simplifyPath(state, path), firstThoughtOld.id),
      })
    : // context is empty and so first thought must be created
      // assume context exists
      createThought(state, {
        path,
        value,
        rank: path ? getPrevRank(state, id) : 0,
      })
}

/** Action-creator for setFirstSubthought. */
export const setFirstSubthoughtActionCreator =
  (payload: Parameters<typeof setFirstSubthought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setFirstSubthought', ...payload })

export default _.curryRight(setFirstSubthought)

// Register this action's metadata
registerActionMetadata('setFirstSubthought', {
  undoable: true,
})
