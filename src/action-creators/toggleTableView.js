// util
import {
  attribute,
  getPrevRank,
  getThoughts,
  pathToContext,
  rankThoughtsFirstMatch,
} from '../util.js'

export default () => (dispatch, getState) => {
  const { cursor } = getState()

  if (cursor) {
    const context = pathToContext(cursor)
    const thoughtsRanked = rankThoughtsFirstMatch(context.concat('=view'))
    const hasView = pathToContext(getThoughts(context)).includes('=view')

    if (hasView && attribute(cursor, '=view') === 'Table') {
      dispatch({
        type: 'existingThoughtDelete',
        // TODO: Why must it be a path rather than a context?
        // otherwise it is not properly removed from other contexts
        thoughtsRanked,
      })
    }
    else {

      // create =view if it does not exist
      if (!hasView) {
        dispatch({
          type: 'newThoughtSubmit',
          context,
          value: '=view',
          rank: getPrevRank(context),
        })
      }

      dispatch({
        type: 'setFirstSubthought',
        context: context.concat('=view'),
        value: 'Table',
      })
    }

    // TOOD: Re-expand thoughts
    // expanded: expandThoughts(state.cursor, state.thoughtIndex, state.contextIndex),
  }

  return !!cursor
}
