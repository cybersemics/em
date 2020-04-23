import { timestamp } from './timestamp'
import { equalArrays } from './equalArrays'
import { notNull } from './notNull'

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
