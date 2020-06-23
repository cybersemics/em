import { existingThoughtDelete } from '../reducers'
import { hasChild, rankThoughtsFirstMatch } from '../selectors'
import { head } from '../util'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Deletes an attribute. */
const deleteAtribute = (state: State, { context, key }: { context: Context, key: string }) => {

  if (!context) return state

  const thoughtsRanked = rankThoughtsFirstMatch(state, [...context, key])

  return hasChild(state, context, key)
    ? existingThoughtDelete(state, {
      context,
      showContexts: false,
      thoughtRanked: head(thoughtsRanked),
    })
    : state
}

export default deleteAtribute
