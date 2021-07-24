import { Context, Index, Lexeme } from '../@types'

/**
 * Generates index of context from lexemes.
 */
export const getContextMap = (lexemes: (Lexeme | undefined)[]) => {
  return (lexemes.filter(lexeme => lexeme) as Lexeme[]).reduce<Index<Context>>((acc, lexeme) => {
    return {
      ...acc,
      ...lexeme.contexts.reduce<Index<Context>>(
        (accInner, { context, id }) => ({
          ...accInner,
          // @MIGRATION_TODO: This provided id is incorrect. Parent id must be provided.
          [id]: context,
        }),
        {},
      ),
    }
  }, {})
}
