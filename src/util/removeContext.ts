import { timestamp } from './timestamp'
import { equalArrays } from './equalArrays'
import { notNull } from './notNull'
import { Context, Lexeme, Timestamp } from '../types'

/** Returns a new thought less the given context. */
export const removeContext = (
  thought: Lexeme,
  context: Context,
  rank: number,
  lastUpdated: Timestamp = timestamp(),
): Lexeme => {
  return Object.assign(
    {},
    thought,
    notNull({
      contexts: thought.contexts
        ? thought.contexts.filter(
            parent => !(equalArrays(parent.context, context) && (rank == null || parent.rank === rank)),
          )
        : [],
      created: thought.created || lastUpdated,
      lastUpdated: lastUpdated,
    }),
  )
}
