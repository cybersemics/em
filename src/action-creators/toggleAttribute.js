// util
import {
  attribute,
  getPrevRank,
  getThoughts,
  head,
  pathToContext,
  rankThoughtsFirstMatch,
} from '../util.js'

export default (key, value) => (dispatch, getState) => {
  const { cursor } = getState()

  if (cursor) {
    const context = pathToContext(cursor)
    const thoughtsRanked = rankThoughtsFirstMatch(context.concat(key))
    const hasView = pathToContext(getThoughts(context)).includes(key)

    if (hasView && attribute(cursor, key) === value) {
      dispatch({
        type: 'existingThoughtDelete',
        context: context.concat('=view'),
        thoughtRanked: head(thoughtsRanked)
      })
    }
    else {

      // create =view if it does not exist
      if (!hasView) {
        dispatch({
          type: 'newThoughtSubmit',
          context,
          value: key,
          rank: getPrevRank(context),
        })
      }

      dispatch({
        type: 'setFirstSubthought',
        context: context.concat(key),
        value,
      })
    }
  }

  return !!cursor
}
