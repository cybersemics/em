import { equalArrays } from './equalArrays.js'
import { notNull } from './notNull.js'
import { timestamp } from './timestamp.js'

/** Returns a new thought that has been moved either between contexts or within a context (i.e. changed rank) */
export const moveThought = (thought, oldContext, newContext, oldRank, newRank) => {
  if (typeof thought === 'string') throw new Error('removeContext expects an [object] thought, not a [string] value.')

  //check if both of two context exist in thought
  const bothExists = [oldContext, newContext]
    .every(context => (thought.contexts || []).find(parent => equalArrays(parent.context, context) ? true : false ));

  return Object.assign({}, thought, notNull({
    contexts: thought.contexts ? thought.contexts
      // remove old context
      .filter(parent => !(equalArrays(parent.context, oldContext) && parent.rank === oldRank))
      // if both exist, do nothing, otherwise add new context
      .concat(bothExists ? [] : {
        context: newContext,
        rank: newRank
      })
      : [],
    created: thought.created,
    lastUpdated: timestamp()
  }))
}
