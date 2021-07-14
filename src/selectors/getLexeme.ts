import { Lexeme, State } from '../@types'
import { hashThought } from '../util'

/** Gets a single thought with a list of its contexts from the thoughtIndex. */
export const getLexeme = (state: State, value: string): Lexeme | undefined =>
  state.thoughts.thoughtIndex[hashThought(value)]

export default getLexeme
