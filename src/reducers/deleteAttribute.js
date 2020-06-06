import { existingThoughtDelete } from '../reducers'
import { hasChild, rankThoughtsFirstMatch } from '../selectors'
import { head } from '../util'

/** Deletes an attribute. */
export default (state, { context, key }) => {

  if (!context) return state

  const thoughtsRanked = rankThoughtsFirstMatch(state, [...context, key])

  return hasChild(state, context, key)
    ? existingThoughtDelete(state, {
      context,
      thoughtRanked: head(thoughtsRanked)
    })
    : state
}
