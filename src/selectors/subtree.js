// util
import {
  head,
} from '../util'

// selectors
import { subtree } from '../selectors'
import getThoughtsRanked from '../selectors/getThoughtsRanked'

/** Gets a nested subtree of all of the given context's descendants */
export default (state, context, depth = 0) =>
  getThoughtsRanked(state, context).map(subthought => ({
    ...subthought,
    subthoughts: subtree(state, context.concat(head(subthought)))
  }))
