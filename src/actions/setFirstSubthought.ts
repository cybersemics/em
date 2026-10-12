import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import createThought from '../actions/createThought'
import editThought from '../actions/editThought'
import { anyChild } from '../selectors/getChildren'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'
import head from '../util/head'

/** Sets the value of the first subthought in the given context. */
const setFirstSubthought = (
  state: State,
  { path, value }: { path: Path; value: string },
  transaction?: ThoughtspaceTransaction,
) => {
  const id = head(path)
  const firstThoughtOld = anyChild(state, id)

  if (!path) {
    console.info({ path, value })
    throw new Error('Cannot setFirstSubthought on non-existent Path')
  }

  return firstThoughtOld
    ? // context has a first and must be changed
      editThought(
        state,
        {
          oldValue: firstThoughtOld.value,
          newValue: value,
          path: path.concat(firstThoughtOld.id) as SimplePath,
        },
        transaction,
      )
    : // context is empty and so first thought must be created
      // assume context exists
      createThought(
        state,
        {
          path,
          value,
          afterId: null,
        },
        transaction,
      )
}

/** Action-creator for setFirstSubthought. */
export const setFirstSubthoughtActionCreator =
  (payload: Parameters<typeof setFirstSubthought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setFirstSubthought', ...payload })

export default command(setFirstSubthought)

// Register this action's metadata
registerActionMetadata('setFirstSubthought', {
  undoable: true,
})
