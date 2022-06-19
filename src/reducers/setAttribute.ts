import _ from 'lodash'
import contextToThoughtId from '../selectors/contextToThoughtId'
import getPrevRank from '../selectors/getPrevRank'
import unroot from '../util/unroot'
import thoughtToPath from '../selectors/thoughtToPath'
import createThought from '../reducers/createThought'
import setFirstSubthought from '../reducers/setFirstSubthought'
import reducerFlow from '../util/reducerFlow'
import Context from '../@types/Context'
import State from '../@types/State'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Sets an attribute on the given context. */
const setAttribute = (state: State, { context, key, value }: { context: Context; key: string; value?: string }) => {
  const parentId = contextToThoughtId(state, context)
  if (!parentId) {
    console.error('')
    return state
  }

  const path = thoughtToPath(state, parentId)
  return reducerFlow([
    !getAllChildrenAsThoughts(state, parentId).some(child => child.value === key)
      ? state =>
          createThought(state, {
            path,
            value: key,
            rank: getPrevRank(state, parentId!),
          })
      : null,

    value != null
      ? setFirstSubthought({
          context: unroot([...context, key]),
          value,
        })
      : null,
  ])(state)
}

export default _.curryRight(setAttribute)
