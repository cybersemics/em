import { head } from './head'
import { Child, ThoughtContext } from '../types'

/** Sums the length of all thoughts in the list of thoughts. */
// works on children with key or context
export const sumSubthoughtsLength = (children: (Child | ThoughtContext)[]) => children.reduce((accum, child) =>
  accum + (
    'value' in child ? (child as Child).value.length
    : (child as ThoughtContext).context.length > 0 ? head(child.context).length
    : 0
  )
, 0)
