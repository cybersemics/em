import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import createThought from '../reducers/createThought'
import setFirstSubthought from '../reducers/setFirstSubthought'
import findDescendant from '../selectors/findDescendant'
import getPrevRank from '../selectors/getPrevRank'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import head from '../util/head'

/** Sets a sequence of values as descendants. Preserves existing descendants and unrelated siblings, except for the last value, which always replaces the existing value. */
const setAttribute = (
  state: State,
  { path, value, values }: { path: Path; value?: string; values?: string[] },
): State => {
  // normalize values if user passed single value
  const _values = values || [value!]
  if (!value && (!values || values.length === 0)) return state

  const thoughtId = head(path)
  const firstSubthoughtId = findDescendant(state, thoughtId, _values[0])
  const idNew = createId()

  // base case: overwrite the first subthought with the last value in the sequence
  if (_values.length === 1) {
    return setFirstSubthought(state, {
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
        rank: getPrevRank(state, thoughtId),
      })

  // recursion
  return setAttribute(stateWithFirstSubthought, {
    path: appendToPath(path, firstSubthoughtId || idNew),
    values: _values.slice(1),
  })
}

export default _.curryRight(setAttribute)
