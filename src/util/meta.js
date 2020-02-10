import {
  getThoughts,
  pathToContext,
} from '../util.js'

/** Returns a subtree of all of the given context's descendants as a single object. "=" are stripped, order and duplicate keys are lost. */
export const meta = (context, depth = 0) =>
  getThoughts(pathToContext(context)).reduce((accum, subthought) => ({
    ...accum,
    [subthought.value.slice(subthought.value.startsWith('=') ? 1 : 0)]: meta(pathToContext(context).concat(subthought.value), depth + 1)
  }), {})
