import { Lexeme, State } from '../@types'
import { concatOne, timestamp } from '../util'
import { getSessionId } from './sessionManager'

/** Returns a new thought that has been moved either between contexts or within a context (i.e. Changed rank). Removes duplicates with the same { value, rank }. */
export const moveLexemeThought = (state: State, lexeme: Lexeme, oldRank: number, newRank: number, id: string) => ({
  ...lexeme,
  contexts: concatOne(
    (lexeme.contexts || []).filter(child => {
      const thought = state.thoughts.contextIndex[child]
      return (
        // remove old context
        (thought.rank !== oldRank || child !== id) &&
        // remove new context with duplicate rank
        (thought.rank !== newRank || child !== id)
      )
    }),
    // add new context
    id,
  ),
  created: lexeme.created || timestamp(),
  lastUpdated: timestamp(),
  updatedBy: getSessionId(),
})
