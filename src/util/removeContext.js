import { timestamp } from './timestamp.js'
import { equalArrays } from './equalArrays.js'
import { notNull } from './notNull.js'

/** Returns a new item less the given context. */
export const removeContext = (item, context, rank) => {
  if (typeof item === 'string') throw new Error('removeContext expects an [object] item, not a [string] value.')
  return Object.assign({}, item, notNull({
      memberOf: item.memberOf ? item.memberOf.filter(parent =>
        !(equalArrays(parent.context, context) && (rank == null || parent.rank === rank))
      ) : [],
      created: item.created,
      lastUpdated: timestamp()
    }))
}
