import { Context, Lexeme } from '../types'
import { concatOne, equalArrays, timestamp } from '../util'

/** Returns a new thought that has been moved either between contexts or within a context (i.e. Changed rank). Removes duplicates with the same { value, rank }. */
export const moveThought = (thought: Lexeme, oldContext: Context, newContext: Context, oldRank: number, newRank: number, id: string) => ({
  ...thought,
  contexts: concatOne((thought.contexts || [])
    .filter(parent =>
      // remove old context
      (parent.rank !== oldRank || !equalArrays(parent.context, oldContext)) &&
      // remove new context with duplicate rank
      (parent.rank !== newRank || !equalArrays(parent.context, newContext))
    ),
  // add new context
  {
    context: newContext,
    rank: newRank,
    id
  }),
  created: thought.created || timestamp(),
  lastUpdated: timestamp()
})
