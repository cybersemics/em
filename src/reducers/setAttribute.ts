import _ from 'lodash'
import { Context, State } from '../@types'
import { createThought, setFirstSubthought } from '../reducers'
import { getPrevRank, getAllChildren } from '../selectors'
import { pathToContext, reducerFlow } from '../util'

/** Sets an attribute on the given context. */
const setAttribute = (state: State, { context, key, value }: { context: Context; key: string; value?: string }) =>
  reducerFlow([
    !pathToContext(getAllChildren(state, context)).includes(key)
      ? state =>
          createThought(state, {
            context,
            value: key,
            rank: getPrevRank(state, context),
          })
      : null,

    value
      ? setFirstSubthought({
          context: context.concat(key),
          value,
        })
      : null,
  ])(state)

export default _.curryRight(setAttribute)
