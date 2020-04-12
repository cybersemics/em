// util
import {
  isFunction,
  pathToContext,
} from '../util'

// selectors
import { meta } from '../selectors'
import getThoughts from '../selectors/getThoughts'

/** Returns a subtree of all of the given context's descendants as a single object. "=" are stripped, order and duplicate keys are lost. */
export default (state, context, depth = 0) =>
  getThoughts(state, pathToContext(context)).reduce((accum, subthought) => ({
    ...accum,
    // only recurse on functions and descendants of functions
    // if depth > 0 we are on a descendant of a function
    ...(isFunction(subthought.value) || depth > 0 ? {
      [subthought.value.slice(isFunction(subthought.value) ? 1 : 0)]: meta(state, pathToContext(context).concat(subthought.value), depth + 1)
    } : null)
  }), {})
