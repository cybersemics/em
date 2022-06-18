import hashThought from '../util/hashThought'
import Lexeme from '../@types/Lexeme'
import State from '../@types/State'

/** Gets the Lexeme of a given value. */
export const getLexeme = (state: State, value: string): Lexeme | undefined =>
  state.thoughts.lexemeIndex[hashThought(value)]

export default getLexeme
