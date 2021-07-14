import { Context, Lexeme, Timestamp } from '../@types'
import { equalArrays } from './equalArrays'
import { notNull } from './notNull'
import { timestamp } from './timestamp'

/** Returns a new thought less the given context. */
export const removeContext = (
  lexeme: Lexeme,
  context: Context,
  rank: number,
  lastUpdated: Timestamp = timestamp(),
): Lexeme => {
  return Object.assign(
    {},
    lexeme,
    notNull({
      contexts: lexeme.contexts
        ? lexeme.contexts.filter(
            parent => !(equalArrays(parent.context, context) && (rank == null || parent.rank === rank)),
          )
        : [],
      created: lexeme.created || lastUpdated,
      lastUpdated: lastUpdated,
    }),
  )
}
