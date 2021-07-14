import { Context, Lexeme, Timestamp } from '../@types'
import { concatOne, equalArrays, timestamp } from '../util'
import { hashContext } from './hashContext'
import { unroot } from './unroot'

/** Returns a new thought that has been moved either between contexts or within a context (i.e. Changed rank). Removes duplicates with the same { value, rank }. */
export const moveLexemeThought = (
  lexeme: Lexeme,
  oldContext: Context,
  newContext: Context,
  oldRank: number,
  newRank: number,
  id: string | null,
  archived: Timestamp,
) => ({
  ...lexeme,
  contexts: concatOne(
    (lexeme.contexts || []).filter(
      parent =>
        // remove old context
        (parent.rank !== oldRank || !equalArrays(parent.context, oldContext)) &&
        // remove new context with duplicate rank
        (parent.rank !== newRank || !equalArrays(parent.context, newContext)),
    ),
    // add new context
    {
      context: newContext,
      rank: newRank,
      id: hashContext(unroot([...newContext, lexeme.value])),
      ...(archived ? { archived } : {}),
    },
  ),
  created: lexeme.created || timestamp(),
  lastUpdated: timestamp(),
})
