// util
import {
  pathToContext,
  reducerFlow,
} from '../util'

// selectors
import {
  getPrevRank,
  getThoughts,
} from '../selectors'

// reducers
import newThoughtSubmit from './newThoughtSubmit'
import setFirstSubthought from './setFirstSubthought'

/** Sets an attribute on the given context. */
export default (state, { context, key, value }) =>

  reducerFlow([

    !pathToContext(getThoughts(state, context)).includes(key)
      ? state => newThoughtSubmit(state, {
        context,
        value: key,
        rank: getPrevRank(state, context),
      })
      : null,

    state => setFirstSubthought(state, {
      context: context.concat(key),
      value,
    })

  ])(state)
