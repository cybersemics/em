import Lexeme from '../@types/Lexeme'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import concatOne from '../util/concatOne'
import timestamp from '../util/timestamp'
import { getSessionId } from './sessionManager'

/** Returns a new thought that has been moved either between contexts or within a context (i.e. Changed rank). Removes duplicates with the same { value, rank }. */
const moveLexemeThought = (state: State, lexeme: Lexeme, oldRank: number, newRank: number, id: string) => ({
  ...lexeme,
  contexts: concatOne(
    (lexeme.contexts || []).filter(child => {
      const thought = getThoughtById(state, child)
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

export default moveLexemeThought
