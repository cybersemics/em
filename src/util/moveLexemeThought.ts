import { Context, Lexeme, Timestamp } from '../@types'
import { concatOne, timestamp } from '../util'

/** Returns a new thought that has been moved either between contexts or within a context (i.e. Changed rank). Removes duplicates with the same { value, rank }. */
export const moveLexemeThought = (
  lexeme: Lexeme,
  oldContext: Context,
  newContext: Context,
  oldRank: number,
  newRank: number,
  id: string,
  archived: Timestamp,
) => ({
  ...lexeme,
  contexts: concatOne(
    (lexeme.contexts || []).filter(
      parent =>
        // remove old context
        (parent.rank !== oldRank || parent.id !== id) &&
        // remove new context with duplicate rank
        (parent.rank !== newRank || parent.id !== id),
    ),
    // add new context
    {
      rank: newRank,
      id,
      ...(archived ? { archived } : {}),
    },
  ),
  created: lexeme.created || timestamp(),
  lastUpdated: timestamp(),
})
