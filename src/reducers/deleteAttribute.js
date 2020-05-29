// util
import {
  head,
  pathToContext,
} from '../util'

// selectors
import {
  getThoughts,
  rankThoughtsFirstMatch,
} from '../selectors'

// reducers
import existingThoughtDelete from './existingThoughtDelete'

/** Deletes an attribute. */
export default (state, { context, key }) => {

  if (!context) return state

  const thoughtsRanked = rankThoughtsFirstMatch(state, context.concat(key))
  const hasAttribute = pathToContext(getThoughts(state, context)).includes(key)

  return hasAttribute
    ? existingThoughtDelete(state, {
      context,
      thoughtRanked: head(thoughtsRanked)
    })
    : state
}
