import { equalArrays } from './equalArrays.js'
import { notNull } from './notNull.js'
import { timestamp } from './timestamp.js'

/** Returns a new item that has been moved either between contexts or within a context (i.e. changed rank) */
export const moveItem = (item, oldContext, newContext, oldRank, newRank) => {
  if (typeof item === 'string') throw new Error('removeContext expects an [object] item, not a [string] value.')
  return Object.assign({}, item, notNull({
      memberOf: item.memberOf ? item.memberOf
        // remove old context
        .filter(parent => !(equalArrays(parent.context, oldContext) && parent.rank === oldRank))
        // add new context
        .concat({
          context: newContext,
          rank: newRank
        })
        : [],
      created: item.created,
      lastUpdated: timestamp()
    }))
}
