import {
  flatMap,
  head,
  getThoughts,
  unroot,
} from '../util'

/** Generates a flat list of all descendants */
export const getDescendants = (context, recur/* INTERNAL */) => {
  const children = getThoughts(context)
  // only append current thought in recursive calls
  return (recur ? [head(context)] : []).concat(
    flatMap(children, child => getDescendants(unroot(context.concat(child)), true))
  )
}
