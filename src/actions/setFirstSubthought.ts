import _ from 'lodash'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import createThought from '../actions/createThought'
import editThought from '../actions/editThought'
import { anyChild } from '../selectors/getChildren'
import getPrevRank from '../selectors/getPrevRank'
import head from '../util/head'

/** Sets the value of the first subthought in the given context. */
const setFirstSubthought = (state: State, { path, value }: { path: Path; value: string }) => {
  const id = head(path)
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

/** Action-creator for setFirstSubthought. */
export const setFirstSubthoughtActionCreator =
  (payload: Parameters<typeof setFirstSubthought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setFirstSubthought', ...payload })

export default _.curryRight(setFirstSubthought)
