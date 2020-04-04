import { head } from './head.js'

/** Sums the length of all thoughts in the list of thoughts. */
// works on children with key or context
export const sumSubthoughtsLength = children => children.reduce((accum, child) =>
  accum + (
    'value' in child ? child.value.length
    : child.context.length > 0 ? head(child.context).length
    : 0
  )
, 0)
