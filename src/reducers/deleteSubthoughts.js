import {
  getThoughts,
} from '../util'

import existingThoughtDelete from './existingThoughtDelete'

export default (state, { context, preventSync }) =>
  getThoughts(context, state.thoughtIndex, state.contextIndex)
    .reduce((accum, subthought) => ({
      ...accum,
      ...existingThoughtDelete({ ...state, ...accum }, {
        context,
        thoughtRanked: subthought,
        preventSync: true,
      })
    }), {})
