import { Context, Index, Lexeme } from '../types'
import { hashContext } from '.'

/**
 * Generates index of context from lexemes.
 */
export const getContextMap = (lexemes: (Lexeme | undefined)[]) => {
  return (lexemes.filter(lexeme => lexeme) as Lexeme[])
    .reduce<Index<Context>>((acc, lexeme) => {
      return {
        ...acc,
        ...lexeme.contexts.reduce<Index<Context>>((accInner, { context }) => ({
          ...accInner,
          [hashContext(context)]: context
        }), {})
      }
    }, {})
}
