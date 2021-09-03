import { Context, Index, Lexeme, State } from '../@types'
import { getContextForThought } from '../selectors'
import { unroot } from './unroot'

/**
 * Generates index of context from lexemes.
 */
export const getContextMap = (state: State, lexemes: (Lexeme | undefined)[]) => {
  return (lexemes.filter(lexeme => lexeme) as Lexeme[]).reduce<Index<Context>>((acc, lexeme) => {
    return {
      ...acc,
      ...lexeme.contexts.reduce<Index<Context>>((accInner, thoughtId) => {
        const thought = state.thoughts.contextIndex[thoughtId]
        return {
          ...accInner,
          [thought.parentId]: unroot(getContextForThought(state, thought.parentId)!),
        }
      }, {}),
    }
  }, {})
}
