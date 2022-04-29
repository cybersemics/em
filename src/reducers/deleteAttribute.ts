import _ from 'lodash'
import { deleteThought } from '../reducers'
import { hasChild, contextToPath } from '../selectors'
import { head } from '../util'
import { Context, State } from '../@types'

/** Deletes an attribute. */
const deleteAtribute = (state: State, { context, key }: { context: Context; key: string }) => {
  if (!context) return state

  const path = contextToPath(state, [...context, key])

  return path && hasChild(state, context, key)
    ? deleteThought(state, {
        context,
        showContexts: false,
        thoughtId: head(path),
      })
    : state
}

export default _.curryRight(deleteAtribute)
