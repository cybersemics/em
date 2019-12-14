import { equalArrays } from './equalArrays.js'
import { notNull } from './notNull.js'
import { timestamp } from './timestamp.js'

/** Returns a new item plus the given context. Does not add duplicates. */
export const addContext = (item, context, rank) => {
  if (typeof item === 'string') throw new Error('removeContext expects an [object] item, not a [string] value.')
  return Object.assign({}, item, notNull({
      memberOf: (item.memberOf || [])
        .filter(parent =>
          !(equalArrays(parent.context, context) && parent.rank === rank)
        )
        .concat({ context, rank }),
      created: item.created,
      lastUpdated: timestamp()
    }))
}
