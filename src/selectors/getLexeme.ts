import { hashThought } from '../util'
import { Lexeme, State } from '../@types'

/** Gets the Lexeme of a given value. */
export const getLexeme = (state: State, value: string): Lexeme | undefined =>
  state.thoughts.lexemeIndex[hashThought(value)]

export default getLexeme
