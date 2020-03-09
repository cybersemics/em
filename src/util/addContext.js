import { equalArrays } from './equalArrays.js'
import { notNull } from './notNull.js'
import { timestamp } from './timestamp.js'

/** Returns a new thought plus the given context. Does not add duplicates. */
export const addContext = (thought, context, rank) => {
  if (typeof thought === 'string') throw new Error('removeContext expects an [object] thought, not a [string] value.')
  return Object.assign({}, thought, notNull({
    contexts: (thought.contexts || [])
      .filter(parent =>
        !equalArrays(parent.context, context)
      )
      .concat({ context, rank }),
    created: thought.created,
    lastUpdated: timestamp()
  }))
}
