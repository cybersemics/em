import { equalArrays } from './equalArrays'
import { notNull } from './notNull'
import { timestamp } from './timestamp'

/** Returns a new thought that has been moved either between contexts or within a context (i.e. Changed rank). */
export const moveThought = (thought, oldContext, newContext, oldRank, newRank) => {
  if (typeof thought === 'string') throw new Error('removeContext expects an [object] thought, not a [string] value.')
  return Object.assign({}, thought, notNull({
    contexts: thought.contexts ? thought.contexts
    // remove old context
      .filter(parent => !(equalArrays(parent.context, oldContext) && parent.rank === oldRank))
    // add new context
      .concat({
        context: newContext,
        rank: newRank
      })
    : [],
    created: thought.created,
    lastUpdated: timestamp()
  }))
}
