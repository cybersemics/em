import { timestamp } from './timestamp'
import { equalArrays } from './equalArrays'
import { notNull } from './notNull'
import { Context, Thought } from '../types'

/** Returns a new thought less the given context. */
export const removeContext = (thought: Thought, context: Context, rank: number): Thought => {
  return Object.assign({}, thought, notNull({
    contexts: thought.contexts ? thought.contexts.filter(parent =>
      !(equalArrays(parent.context, context) && (rank == null || parent.rank === rank))
    ) : [],
    created: thought.created,
    lastUpdated: timestamp()
  }))
}
