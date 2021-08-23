import _ from 'lodash'
import { getPrevRank } from '../selectors'
import { createThought, setFirstSubthought } from '../reducers'
import { reducerFlow } from '../util'
import { Context, State } from '../@types'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Sets an attribute on the given context. */
const setAttribute = (state: State, { context, key, value }: { context: Context; key: string; value?: string }) =>
  reducerFlow([
    !getAllChildrenAsThoughts(state, context).some(child => child.value === key)
      ? state =>
          createThought(state, {
            context,
            value: key,
            rank: getPrevRank(state, context),
          })
      : null,

    value != null
      ? setFirstSubthought({
          context: [...context, key],
          value,
        })
      : null,
  ])(state)

export default _.curryRight(setAttribute)
