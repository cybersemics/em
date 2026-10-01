import { deleteThought } from '.'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import createThought from '../actions/createThought'
import setFirstSubthought from '../actions/setFirstSubthought'
import findDescendant from '../selectors/findDescendant'
import { getAllChildren, hasChildren } from '../selectors/getChildren'
import getFirstChildPlacement from '../selectors/getFirstChildPlacement'
import getSortPreference from '../selectors/getSortPreference'
import getSortedPlacement from '../selectors/getSortedPlacement'
import getThoughtById from '../selectors/getThoughtById'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import command from '../util/command'
import createId from '../util/createId'
import head from '../util/head'
import isAttribute from '../util/isAttribute'

/** Toggles the given attribute value. If the attribute value exists, deletes the entire attribute. If value is not specified, toggles the attribute itself. */
const toggleAttribute = (
  state: State,
  { path, value, values }: { path: Path | null; value?: string; values?: string[] },
  transaction?: ThoughtspaceTransaction,
): State => {
  // normalize values if user passed single value
  const _values = values || [value!]
  if (!path || (!value && (!values || values.length === 0))) return state

  const thoughtId = head(path)

  const firstSubthoughtId = findDescendant(state, thoughtId, _values[0])
  const idNew = createId()

  // base case: delete or overwrite the first subthought with the value slot
  // A nullary attribute (e.g. =test) is a key, not a value, so it is handled below by its own existence rather than by overwriting an unrelated first child.
  if (_values.length === 1 && !isAttribute(_values[0])) {
    const firstThought = getThoughtById(state, getAllChildren(state, thoughtId)[0])

    // Handle standalone attributes, e.g. =pin as opposed to =pin/true, skip deleting the attribute
    // The parent recursion will take care of deleting the attribute if it is set to true.
    if (!firstThought && _values[0] === 'true') {
      return state
    }

    return firstThought?.value === _values[0]
      ? deleteThought(state, { pathParent: path, thoughtId: firstThought.id }, transaction)
      : setFirstSubthought(
          state,
          {
            path: path,
            value: _values[0],
          },
          transaction,
        )
  }

  // toggle a nullary attribute off if it exists; otherwise it is created below
  if (_values.length === 1 && firstSubthoughtId) {
    return deleteThought(state, { pathParent: path, thoughtId: firstSubthoughtId }, transaction)
  }

  // otherwise, create the first subthought if it does not exist and recurse
  const stateWithFirstSubthought = firstSubthoughtId
    ? state
    : createThought(
        state,
        {
          id: idNew,
          path,
          value: _values[0],
          afterId:
            getSortPreference(state, thoughtId).type === 'Alphabetical'
              ? getSortedPlacement(state, thoughtId, _values[0])
              : getFirstChildPlacement(state, thoughtId),
        },
        transaction,
      )

  // recursion
  // When the sequence ends in an attribute key, the recursive call receives no values and returns the state unchanged.
  const stateNew = toggleAttribute(
    stateWithFirstSubthought,
    {
      path: appendToPath(path, firstSubthoughtId || idNew),
      values: _values.slice(1),
    },
    transaction,
  )

  // after recursion, delete empty descendants
  return firstSubthoughtId && !hasChildren(stateNew, firstSubthoughtId)
    ? deleteThought(stateNew, { pathParent: path, thoughtId: firstSubthoughtId }, transaction)
    : stateNew
}

/** Action-creator for toggleAttribute. */
export const toggleAttributeActionCreator =
  (payload: Parameters<typeof toggleAttribute>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleAttribute', ...payload })

export default command(toggleAttribute)

// Register this action's metadata
registerActionMetadata('toggleAttribute', {
  undoable: true,
})
