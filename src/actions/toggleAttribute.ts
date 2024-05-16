import { deleteThought } from '.'
import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import createThought from '../actions/createThought'
import setFirstSubthought from '../actions/setFirstSubthought'
import findDescendant from '../selectors/findDescendant'
import { getAllChildren, hasChildren } from '../selectors/getChildren'
import getPrevRank from '../selectors/getPrevRank'
import getSortPreference from '../selectors/getSortPreference'
import getSortedRank from '../selectors/getSortedRank'
import getThoughtById from '../selectors/getThoughtById'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import head from '../util/head'

/** Toggles the given attribute value. If the attribute value exists, deletes the entire attribute. If value is not specified, toggles the attribute itself. */
const toggleAttribute = (
  state: State,
  { path, value, values }: { path: Path | null; value?: string; values?: string[] },
): State => {
  // normalize values if user passed single value
  const _values = values || [value!]
  if (!path || (!value && (!values || values.length === 0))) return state

  const thoughtId = head(path)
  const firstSubthoughtId = findDescendant(state, thoughtId, _values[0])
  const idNew = createId()

  // base case: delete or overwrite the first subthought with the last value in the sequence
  if (_values.length === 1) {
    const firstThought = getThoughtById(state, getAllChildren(state, thoughtId)[0])
    return firstThought?.value === _values[0]
      ? deleteThought(state, { pathParent: path, thoughtId: firstThought.id })
      : setFirstSubthought(state, {
          path: path,
          value: _values[0],
        })
  }

  // otherwise, create the first subthought if it does not exist and recurse
  const stateWithFirstSubthought = firstSubthoughtId
    ? state
    : createThought(state, {
        id: idNew,
        path,
        value: _values[0],
        rank:
          getSortPreference(state, thoughtId).type === 'Alphabetical'
            ? getSortedRank(state, thoughtId, _values[0])
            : getPrevRank(state, thoughtId),
      })

  // recursion
  const stateNew = toggleAttribute(stateWithFirstSubthought, {
    path: appendToPath(path, firstSubthoughtId || idNew),
    values: _values.slice(1),
  })

  // after recursion, delete empty descendants
  return firstSubthoughtId && !hasChildren(stateNew, firstSubthoughtId)
    ? deleteThought(stateNew, { pathParent: path, thoughtId: firstSubthoughtId })
    : stateNew
}

/** Action-creator for toggleAttribute. */
export const toggleAttributeActionCreator =
  (payload: Parameters<typeof toggleAttribute>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleAttribute', ...payload })

export default _.curryRight(toggleAttribute)
