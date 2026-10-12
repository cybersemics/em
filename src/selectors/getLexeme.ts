import Lexeme from '../@types/Lexeme'
import State from '../@types/State'

/** Gets the Lexeme of a given value. */
export const getLexeme = (state: State, value: string): Lexeme | undefined => state.thoughts.getLexeme(value)

export default getLexeme
