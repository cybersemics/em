import { timestamp } from './timestamp.js'
import { equalArrays } from './equalArrays.js'
import { notNull } from './notNull.js'

/** Returns a new thought less the given context. */
export const removeContext = (thought, context, rank) => {
  if (typeof thought === 'string') throw new Error('removeContext expects an [object] thought, not a [string] value.')
  return Object.assign({}, thought, notNull({
    contexts: thought.contexts ? thought.contexts.filter(parent =>
      !(equalArrays(parent.context, context) && (rank == null || parent.rank === rank))
    ) : [],
    created: thought.created,
    lastUpdated: timestamp()
  }))
}
