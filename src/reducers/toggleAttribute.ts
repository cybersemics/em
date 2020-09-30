import _ from 'lodash'
import { existingThoughtDelete, newThoughtSubmit, setFirstSubthought } from '../reducers'
import { attributeEquals, getPrevRank, getThoughtsRanked, hasChild } from '../selectors'
import { head, reducerFlow } from '../util'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Toggles the given attribute. */
const toggleAttribute = (state: State, { context, key, value }: { context: Context, key: string, value: string }) => {

  console.log('state', state)

  console.log('context', context, 'key', key, 'value', value)

  if (!context) return state

  const thoughtsRanked = getThoughtsRanked(state, context.concat(key))

  console.log('thoughtsRanked', thoughtsRanked, context.concat(key))

  console.log('head.thoughtsRanked', head(thoughtsRanked))

  console.log('attributeEquals(state, context, key, value)', attributeEquals(state, context, key, value))

  console.log('hasChild(state, context, key)', hasChild(state, context, key))

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
      setFirstSubthought({
        context: context.concat(key),
        value,
      })

    ])(state)
}

export default _.curryRight(toggleAttribute)
