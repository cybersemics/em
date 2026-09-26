import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import createThought from '../actions/createThought'
import setFirstSubthought from '../actions/setFirstSubthought'
import findDescendant from '../selectors/findDescendant'
import getFirstChildPlacement from '../selectors/getFirstChildPlacement'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import command from '../util/command'
import createId from '../util/createId'
import head from '../util/head'
import isAttribute from '../util/isAttribute'

interface setDescendantPayload {
  path: Path
  value?: string
  values?: string[]
}

/** Sets a sequence of values as descendants. Attribute keys (e.g. =pin) are found or created, preserving existing descendants and unrelated siblings. A non-attribute last value is the attribute's value slot, and replaces the existing first subthought. */
const setDescendant = (
  state: State,
  { path, value, values }: setDescendantPayload,
  transaction?: ThoughtspaceTransaction,
): State => {
  // normalize values to array
  const _values = values || [value!]
  if (!value && (!values || values.length === 0)) return state

  const thoughtId = head(path)

  // base case: overwrite the first subthought with the value slot
  // A nullary attribute (e.g. =heading1) is a key, not a value, so it falls through to find-or-create below rather than overwriting an unrelated first child.
  if (_values.length === 1 && !isAttribute(_values[0])) {
    return setFirstSubthought(
      state,
      {
        path: path,
        value: _values[0],
      },
      transaction,
    )
  }

  const firstSubthoughtId = findDescendant(state, thoughtId, _values[0])
  const idNew = createId()

  // otherwise, create the first subthought if it does not exist and recurse
  const stateWithFirstSubthought = firstSubthoughtId
    ? state
    : createThought(
        state,
        {
          id: idNew,
          path,
          value: _values[0],
          afterId: getFirstChildPlacement(state, thoughtId),
        },
        transaction,
      )

  // recursion
  // When the sequence ends in an attribute key, the recursive call receives no values and returns the state unchanged.
  return setDescendant(
    stateWithFirstSubthought,
    {
      path: appendToPath(path, firstSubthoughtId || idNew),
      values: _values.slice(1),
    },
    transaction,
  )
}

/** Action-creator for setDescendant. */
export const setDescendantActionCreator =
  (payload: Parameters<typeof setDescendant>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setDescendant', ...payload })

export default command(setDescendant)

// Register this action's metadata
registerActionMetadata('setDescendant', {
  undoable: true,
})
