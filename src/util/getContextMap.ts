import { Context, Index, Lexeme, State } from '../@types'
import { getContextForThought } from '../selectors'
import { parentOf } from './parentOf'
import { unroot } from './unroot'

// @MIGRATION_TODO: Should return thought ids instead of context.
/**
 * Generates index of context from lexemes.
 */
export const getContextMap = (state: State, lexemes: (Lexeme | undefined)[]) => {
  return (lexemes.filter(lexeme => lexeme) as Lexeme[]).reduce<Index<Context>>((acc, lexeme) => {
    return {
      ...acc,
      ...lexeme.contexts.reduce<Index<Context>>(
        (accInner, { id }) => ({
          ...accInner,
          // @MIGRATION_TODO: This provided id is incorrect. Parent id must be provided.
          [id]: unroot(parentOf(getContextForThought(state, id)!)),
        }),
        {},
      ),
    }
  }, {})
}
