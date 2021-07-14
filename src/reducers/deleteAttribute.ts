import _ from 'lodash'
import { Context, State } from '../@types'
import { deleteThought } from '../reducers'
import { hasChild, rankThoughtsFirstMatch } from '../selectors'
import { head } from '../util'

/** Deletes an attribute. */
const deleteAtribute = (state: State, { context, key }: { context: Context; key: string }) => {
  if (!context) return state

  const path = rankThoughtsFirstMatch(state, [...context, key])

  return hasChild(state, context, key)
    ? deleteThought(state, {
        context,
        showContexts: false,
        thoughtRanked: head(path),
      })
    : state
}

export default _.curryRight(deleteAtribute)
