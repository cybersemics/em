import { Context, Index, Lexeme, State } from '../@types'
import { thoughtToContext, getThoughtById } from '../selectors'
import { unroot } from './unroot'

/**
 * Generates index of context from lexemes.
 */
export const getContextMap = (state: State, lexemes: (Lexeme | undefined)[]) => {
  return (lexemes.filter(lexeme => lexeme) as Lexeme[]).reduce<Index<Context>>((acc, lexeme) => {
    return {
      ...acc,
      ...lexeme.contexts.reduce<Index<Context>>((accInner, thoughtId) => {
        const thought = getThoughtById(state, thoughtId)
        return {
          ...accInner,
          [thought.parentId]: unroot(thoughtToContext(state, thought.parentId)!),
        }
      }, {}),
    }
  }, {})
}
