import {
  getThoughts,
} from '../util.js'

/** Gets a subtree of all of the given context's descendants as a single object. Order and duplicate keys are lost. */
export const meta = (context, depth=0) =>
  getThoughts(context).reduce((accum, subthought) => ({
    ...accum,
    [subthought.value.slice(subthought.value.startsWith('=') ? 1 : 0)]: meta(context.concat(subthought.value), depth + 1)
  }), {})
