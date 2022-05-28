import { Context, Lexeme, State } from '../@types'
import { contextToThoughtId, getThoughtById } from '../selectors'

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
      const thought = getThoughtById(state, child)
      return thought.parentId !== contextToThoughtId(state, context)
    }),
  }
}
