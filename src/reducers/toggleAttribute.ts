import { existingThoughtDelete, newThoughtSubmit, setFirstSubthought } from '../reducers'
import { attributeEquals, getPrevRank, hasChild, rankThoughtsFirstMatch } from '../selectors'
import { head, reducerFlow } from '../util'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Toggles the given attribute. */
const toggleAttribute = (state: State, { context, key, value }: { context: Context, key: string, value: string }) => {

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

export default toggleAttribute
