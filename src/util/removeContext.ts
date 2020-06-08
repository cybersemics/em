import { timestamp } from './timestamp'
import { equalArrays } from './equalArrays'
import { notNull } from './notNull'
import { Context, Lexeme } from '../types'

/** Returns a new thought less the given context. */
export const removeContext = (thought: Lexeme, context: Context, rank: number): Lexeme => {
  return Object.assign({}, thought, notNull({
    contexts: thought.contexts ? thought.contexts.filter(parent =>
      !(equalArrays(parent.context, context) && (rank == null || parent.rank === rank))
    ) : [],
    created: thought.created || timestamp(),
    lastUpdated: timestamp()
  }))
}
