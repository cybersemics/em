import { deleteThought } from '.'
import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import findDescendant from '../selectors/findDescendant'
import { hasChildren } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import appendToPath from '../util/appendToPath'
import head from '../util/head'

/** Deletes an attribute. */
const deleteAttribute = (
  state: State,
  { path, value, values }: { path: Path | null; value?: string; values?: string[] },
): State => {
  // normalize values if user passed single value
  const _values = values || [value!]

  if (!path || (!value && (!values || values.length === 0))) return state

  const thoughtId = head(path)
  const firstSubthoughtId = findDescendant(state, thoughtId, _values[0])

  // base case: delete or overwrite the first subthought with the last value in the sequence
  if (_values.length === 1) {
    const firstSubthought = firstSubthoughtId && getThoughtById(state, firstSubthoughtId)
    return firstSubthought ? deleteThought(state, { pathParent: path, thoughtId: firstSubthoughtId! }) : state
  }

  // otherwise, create the first subthought if it does not exist and recurse
  // recursion
  const stateNew = firstSubthoughtId
    ? deleteAttribute(state, {
        path: appendToPath(path, firstSubthoughtId),
        values: _values.slice(1),
      })
    : state

  // after recursion, delete empty descendants
  return firstSubthoughtId && !hasChildren(stateNew, firstSubthoughtId)
    ? deleteThought(stateNew, { pathParent: path, thoughtId: firstSubthoughtId })
    : stateNew
}

/** Action-creator for deleteAttribute. */
export const deleteAttributeActionCreator =
  (payload: Parameters<typeof deleteAttribute>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'deleteAttribute', ...payload })

export default _.curryRight(deleteAttribute)
