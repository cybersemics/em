import { attributeEquals, getPrevRank, hasChild, rankThoughtsFirstMatch } from '../selectors'
import { head, reducerFlow } from '../util'

// reducers
import existingThoughtDelete from './existingThoughtDelete'
import newThoughtSubmit from './newThoughtSubmit'
import setFirstSubthought from './setFirstSubthought'

/** Toggles the given attribute. */
export default (state, { context, key, value }) => {

  if (!context) return state

  const thoughtsRanked = rankThoughtsFirstMatch(state, context.concat(key))

  return attributeEquals(state, context, key, value)
    // delete existing attribute
    ? existingThoughtDelete(state, {
      context,
      thoughtRanked: head(thoughtsRanked)
    })
    // create new attribute
    : reducerFlow([

      // create attribute if it does not exist
      !hasChild(state, context, key)
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
