import { Context, Lexeme, State } from '../@types'
import { hashContext } from './hashContext'

// @MIGRATION_TODO: Use id instead of context.
/** Returns a new lexeme remove duplicated given context. */
export const removeDuplicatedContext = (state: State, lexeme: Lexeme, context: Context): Lexeme => {
  // @MIGRATION_TODO: Is commented logic needed ?
  // const topRankContext = sort(lexeme.contexts || [], compareByRank).find(
  //   parent => parent.id === hashContext(state, context),
  // )

  return {
    ...lexeme,
    contexts: (lexeme.contexts || []).filter(child => {
      const thought = state.thoughts.contextIndex[child]
      return thought.parentId !== hashContext(state, context)
    }),
  }
}
