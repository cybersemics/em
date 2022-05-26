import _ from 'lodash'
import { contextToThoughtId, getPrevRank } from '../selectors'
import { createThought, setFirstSubthought } from '../reducers'
import { reducerFlow } from '../util'
import { Context, State } from '../@types'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Sets an attribute on the given context. */
const setAttribute = (state: State, { context, key, value }: { context: Context; key: string; value?: string }) => {
  const id = contextToThoughtId(state, context)
  return reducerFlow([
    !getAllChildrenAsThoughts(state, id).some(child => child.value === key)
      ? state =>
          createThought(state, {
            context,
            value: key,
            rank: getPrevRank(state, id!),
          })
      : null,

    value != null
      ? setFirstSubthought({
          context: [...context, key],
          value,
        })
      : null,
  ])(state)
}

export default _.curryRight(setAttribute)
