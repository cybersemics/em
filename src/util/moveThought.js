import { equalArrays } from './equalArrays.js'
import { notNull } from './notNull.js'
import { timestamp } from './timestamp.js'

/** Returns a new thought that has been moved either between contexts or within a context (i.e. changed rank) */
export const moveThought = (thought, oldContext, newContext, oldRank, newRank) => {
  if (typeof thought === 'string') throw new Error('removeContext expects an [object] thought, not a [string] value.')
  return Object.assign({}, thought, notNull({
    contexts: thought.contexts ? thought.contexts
      // remove old context
      .filter(parent => !(equalArrays(parent.context, oldContext) && parent.rank === oldRank))
      // if new context exists in though, do nothing, otherwise add new context
      .concat(
        ((thought.contexts || []).find(parent => equalArrays(parent.context, newContext)) && !equalArrays(oldContext, newContext)) ? []
          : {
            context: newContext,
            rank: newRank
          })
      : [],
    created: thought.created,
    lastUpdated: timestamp()
  }))
}
