import { deleteThought } from '.'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import createThought from '../actions/createThought'
import findDescendant from '../selectors/findDescendant'
import { getChildrenRanked, hasChildren } from '../selectors/getChildren'
import getFirstChildPlacement from '../selectors/getFirstChildPlacement'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import command from '../util/command'
import createId from '../util/createId'
import head from '../util/head'
import isAttribute from '../util/isAttribute'

/** Toggles a thought. If any ancestors are missing, adds them. When toggling off, ancestors with no other children are deleted. Preserves siblings. */
const toggleThought = (
  state: State,
  { path, value, values }: { path: Path | null; value?: string; values?: string[] },
  transaction?: ThoughtspaceTransaction,
): State => {
  // normalize values if user passed single value
  const _values = values || [value!]
  values = values || [value!]
  if (!path || (!value && (!values || values.length === 0))) return state

  const thoughtId = head(path)
  const subthoughtId = findDescendant(state, thoughtId, _values[0])
  const idNew = createId()

  // delete the last thought if it exists
  if (_values.length === 1 && subthoughtId) {
    return deleteThought(state, { pathParent: path, thoughtId: subthoughtId }, transaction)
  }

  // otherwise, create the thought if it does not exist and recurse
  const stateWithSubthought = subthoughtId
    ? state
    : createThought(
        state,
        {
          id: idNew,
          path,
          value: _values[0],
          // meta attributes go at the top of the context
          afterId: isAttribute(_values[0])
            ? getFirstChildPlacement(state, thoughtId)
            : (getChildrenRanked(state, thoughtId).at(-1)?.id ?? null),
        },
        transaction,
      )

  // recursion
  const stateNew = toggleThought(
    stateWithSubthought,
    {
      path: appendToPath(path, subthoughtId || idNew),
      values: _values.slice(1),
    },
    transaction,
  )

  // after recursion, delete empty descendants
  return values.length > 1 && subthoughtId && !hasChildren(stateNew, subthoughtId)
    ? deleteThought(stateNew, { pathParent: path, thoughtId: subthoughtId }, transaction)
    : stateNew
}

/** Action-creator for toggleThought. */
export const toggleThoughtActionCreator =
  (payload: Parameters<typeof toggleThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleThought', ...payload })

export default command(toggleThought)

// Register this action's metadata
registerActionMetadata('toggleThought', {
  undoable: true,
})
