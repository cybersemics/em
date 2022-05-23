import _ from 'lodash'
import { deleteThought, createThought, setFirstSubthought } from '../reducers'
import { attributeEquals, getPrevRank, hasChild, contextToPath } from '../selectors'
import { head, reducerFlow, unroot } from '../util'
import { Context, State } from '../@types'

/** Toggles the given attribute value. If the attribute value exists, deletes the entire attribute. If value is not specified, just toggles the attribute itself. */
const toggleAttribute = (state: State, { context, key, value }: { context: Context; key: string; value?: string }) => {
  if (!context) return state

  const isNullaryAttribute = value === undefined

  const path = contextToPath(state, context)
  const attributePath = contextToPath(state, unroot([...context, key]))

  const exists = !isNullaryAttribute
    ? attributeEquals(state, context, key, value!)
    : !path || hasChild(state, head(path), key)

  return attributePath && exists
    ? // delete existing attribute
      deleteThought(state, {
        context,
        thoughtId: head(attributePath),
      })
    : // create new attribute
      reducerFlow([
        // create attribute if it does not exist
        !path || !hasChild(state, head(path), key)
          ? state =>
              createThought(state, {
                context,
                value: key,
                rank: getPrevRank(state, context),
              })
          : null,

        // set attribute value
        !isNullaryAttribute
          ? setFirstSubthought({
              context: [...unroot(context), key],
              value: value!,
            })
          : null,
      ])(state)
}

export default _.curryRight(toggleAttribute)
