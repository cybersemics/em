import _ from 'lodash'
import getPrevRank from '../selectors/getPrevRank'
import unroot from '../util/unroot'
import head from '../util/head'
import createThought from '../reducers/createThought'
import setFirstSubthought from '../reducers/setFirstSubthought'
import reducerFlow from '../util/reducerFlow'
import Path from '../@types/Path'
import State from '../@types/State'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import createId from '../util/createId'

/** Sets an attribute on the given context. */
const setAttribute = (state: State, { path, key, value }: { path: Path; key: string; value?: string }) => {
  const parentId = head(path)
  const attributeId = getAllChildrenAsThoughts(state, parentId).find(child => child.value === key)?.id || createId()
  return reducerFlow([
    !getAllChildrenAsThoughts(state, parentId).some(child => child.value === key)
      ? state =>
          createThought(state, {
            id: attributeId,
            path,
            value: key,
            rank: getPrevRank(state, parentId),
          })
      : null,

    value != null
      ? setFirstSubthought({
          path: unroot([...path, attributeId]),
          value,
        })
      : null,
  ])(state)
}

export default _.curryRight(setAttribute)
