import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import createThought from '../reducers/createThought'
import setFirstSubthought from '../reducers/setFirstSubthought'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getPrevRank from '../selectors/getPrevRank'
import createId from '../util/createId'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import unroot from '../util/unroot'

/** Sets an attribute on the given context. */
const setAttribute = (state: State, { path, value, values }: { path: Path; value?: string; values?: string[] }) => {
  const _values = values || [value!]
  const parentId = head(path)
  const attributeId =
    getAllChildrenAsThoughts(state, parentId).find(child => child.value === _values[0])?.id || createId()
  return reducerFlow([
    !getAllChildrenAsThoughts(state, parentId).some(child => child.value === _values[0])
      ? state =>
          createThought(state, {
            id: attributeId,
            path,
            value: _values[0],
            rank: getPrevRank(state, parentId),
          })
      : null,

    _values[1] != null
      ? setFirstSubthought({
          path: unroot([...path, attributeId]),
          value: _values[1],
        })
      : null,
  ])(state)
}

export default _.curryRight(setAttribute)
