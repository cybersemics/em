import { Context, Lexeme, State } from '../@types'
import { compareByRank, sort } from '../util'
import { hashContext } from './hashContext'

// @MIGRATION_TODO: Use id instead of context.
/** Returns a new lexeme remove duplicated given context. */
export const removeDuplicatedContext = (state: State, lexeme: Lexeme, context: Context): Lexeme => {
  const topRankContext = sort(lexeme.contexts || [], compareByRank).find(
    parent => parent.id === hashContext(state, context),
  )

  return {
    ...lexeme,
    contexts: (lexeme.contexts || []).filter(
      parent => parent.rank === topRankContext?.rank || parent.id !== hashContext(state, context),
    ),
  }
}
