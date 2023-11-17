import Context from '../@types/Context'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import thoughtToContext from '../selectors/thoughtToContext'
import nonNull from './nonNull'
import unroot from './unroot'

/**
 * Generates index of context from lexemes.
 */
const getContextMap = (state: State, lexemes: (Lexeme | undefined)[]) =>
  lexemes.filter(nonNull).reduce<Index<Context>>(
    (acc, lexeme) => ({
      ...acc,
      ...lexeme.contexts.reduce<Index<Context>>((accInner, thoughtId) => {
        const thought = getThoughtById(state, thoughtId)
        return {
          ...accInner,
          [thought.parentId]: unroot(thoughtToContext(state, thought.parentId)!),
        }
      }, {}),
    }),
    {},
  )

export default getContextMap
