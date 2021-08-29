import _ from 'lodash'
import { deleteThought, createThought, setFirstSubthought } from '../reducers'
import { attributeEquals, getPrevRank, hasChild, rankThoughtsFirstMatch } from '../selectors'
import { head, reducerFlow, unroot } from '../util'
import { Context, State } from '../@types'

/** Toggles the given attribute. */
const toggleAttribute = (state: State, { context, key, value }: { context: Context; key: string; value: string }) => {
  if (!context) return state

  /**
   * Get actual path of the the key.
   */
  const path = () => rankThoughtsFirstMatch(state, context.concat(key))

  return attributeEquals(state, context, key, value)
    ? // delete existing attribute
      deleteThought(state, {
        context,
        thoughtId: head(path()),
      })
    : // create new attribute
      reducerFlow([
        // create attribute if it does not exist
        !hasChild(state, context, key)
          ? state =>
              createThought(state, {
                context,
                value: key,
                rank: getPrevRank(state, context),
              })
          : null,

        // set attribute value
        setFirstSubthought({
          context: [...unroot(context), key],
          value,
        }),
      ])(state)
}

export default _.curryRight(toggleAttribute)
