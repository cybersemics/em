import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import createThought from '../reducers/createThought'
import setFirstSubthought from '../reducers/setFirstSubthought'
import findDescendant from '../selectors/findDescendant'
import getPrevRank from '../selectors/getPrevRank'
import createId from '../util/createId'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import unroot from '../util/unroot'

/** Sets an attribute on the given context. */
const setAttribute = (state: State, { path, value, values }: { path: Path; value?: string; values?: string[] }) => {
  const _values = values || [value!]
  if (!value && (!values || values.length === 0)) return state

  const thoughtId = head(path)
  const attributeId = findDescendant(state, thoughtId, _values[0])
  const idNew = createId()

  return reducerFlow([
    !attributeId
      ? state =>
          createThought(state, {
            id: idNew,
            path,
            value: _values[0],
            rank: getPrevRank(state, thoughtId),
          })
      : null,

    _values[1] != null
      ? setFirstSubthought({
          path: unroot([...path, attributeId || idNew]),
          value: _values[1],
        })
      : null,
  ])(state)
}

export default _.curryRight(setAttribute)
