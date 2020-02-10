import {
  getThoughts,
  rankThoughtsSequential,
} from '../util.js'

import existingThoughtDelete from './existingThoughtDelete'

export default (state, { context, preventSync }) =>
  getThoughts(context, state.thoughtIndex, state.contextIndex)
    .reduce((accum, subthought) => ({
      ...accum,
      ...existingThoughtDelete({ ...state, ...accum }, {
        // TODO: existingThoughtDelete should take a context instead of a path
        thoughtsRanked: rankThoughtsSequential(context).concat(subthought),
        preventSync: true,
      })
    }), {})
