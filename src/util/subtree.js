import {
  getThoughtsRanked ,
  head,
} from '../util.js'

/** Gets a nested subtree of all of the given context's descendants */
export const subtree = (context, depth=0) =>
  getThoughtsRanked(context).map(subthought => ({
    ...subthought,
    subthoughts: subtree(context.concat(head(subthought)))
  }))
