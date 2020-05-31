import {
  compareByRank,
  equalArrays,
  notNull,
  sort,
} from '../util'
import { Context, Thought } from '../types'

/** Returns a new thought remove duplicated given context. */
export const removeDuplicatedContext = (thought: Thought, context: Context) => {
  if (typeof thought === 'string') throw new Error('removeDuplicatedContext expects an [object] thought, not a [string] value.')
  const topRankContext = sort(thought.contexts || [], compareByRank)
    .find(parent => equalArrays(parent.context, context))
  return Object.assign({}, thought, notNull({
    contexts: (thought.contexts || [])
      .filter(parent =>
        !(equalArrays(parent.context, context) && parent.rank !== topRankContext.rank)
      )
  }))
}
