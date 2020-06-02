// util
import {
  head,
  pathToContext,
  reducerFlow,
} from '../util'

// selectors
import {
  attributeEquals,
  getPrevRank,
  getThoughts,
  rankThoughtsFirstMatch,
} from '../selectors'

// reducers
import existingThoughtDelete from './existingThoughtDelete'
import newThoughtSubmit from './newThoughtSubmit'
import setFirstSubthought from './setFirstSubthought'

/** Toggles the given attribute. */
export default (state, { context, key, value }) => {

  if (!context) return state

  const thoughtsRanked = rankThoughtsFirstMatch(state, context.concat(key))

  if (attributeEquals(state, context, key, value)) {
    return existingThoughtDelete(state, {
      context,
      thoughtRanked: head(thoughtsRanked)
    })
  }
  // create attribute if it does not exist
  else {
    const hasAttribute = pathToContext(getThoughts(state, context)).includes(key)

    return reducerFlow([

      // create attribute if it does not exist
      !hasAttribute
        ? state => newThoughtSubmit(state, {
          context,
          value: key,
          rank: getPrevRank(state, context),
        })
        : null,

      // set attribute value
      state => setFirstSubthought(state, {
        context: context.concat(key),
        value,
      })

    ])(state)
  }
}
