import { store } from '../store'

// util
import {
  head,
} from '../util'

// selectors
import getThoughtsRanked from '../selectors/getThoughtsRanked'

/** Gets a nested subtree of all of the given context's descendants */
export const subtree = (context, depth = 0) =>
  getThoughtsRanked(store.getState(), context).map(subthought => ({
    ...subthought,
    subthoughts: subtree(context.concat(head(subthought)))
  }))
