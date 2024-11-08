import { deleteThought } from '.'
import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import createThought from '../actions/createThought'
import findDescendant from '../selectors/findDescendant'
import { hasChildren } from '../selectors/getChildren'
import getNextRank from '../selectors/getNextRank'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import head from '../util/head'

/** Toggles a thought. If any ancestors are missing, adds them. When toggling off, ancestors with no other children are deleted. Preserves siblings. */
const toggleThought = (
  state: State,
  { path, value, values }: { path: Path | null; value?: string; values?: string[] },
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
    return deleteThought(state, { pathParent: path, thoughtId: subthoughtId })
  }

  // otherwise, create the thought if it does not exist and recurse
  const stateWithSubthought = subthoughtId
    ? state
    : createThought(state, {
        id: idNew,
        path,
        value: _values[0],
        rank: getNextRank(state, thoughtId),
      })

  // recursion
  const stateNew = toggleThought(stateWithSubthought, {
    path: appendToPath(path, subthoughtId || idNew),
    values: _values.slice(1),
  })

  // after recursion, delete empty descendants
  return values.length > 1 && subthoughtId && !hasChildren(stateNew, subthoughtId)
    ? deleteThought(stateNew, { pathParent: path, thoughtId: subthoughtId })
    : stateNew
}

/** Action-creator for toggleThought. */
export const toggleThoughtActionCreator =
  (payload: Parameters<typeof toggleThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleThought', ...payload })

export default _.curryRight(toggleThought)
