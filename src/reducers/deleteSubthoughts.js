// reducers
import existingThoughtDelete from './existingThoughtDelete'

// selectors
import getThoughts from '../selectors/getThoughts'

/** Deletes all subthoughts in the given context. */
export default (state, { context, preventSync }) =>
  getThoughts(state, context)
    .reduce((accum, subthought) => ({
      ...accum,
      ...existingThoughtDelete({ ...state, ...accum }, {
        context,
        thoughtRanked: subthought,
        preventSync: true,
      })
    }), {})
