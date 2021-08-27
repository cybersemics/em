import { hashThought } from '../util'
import { Lexeme, State } from '../@types'

/** Gets a single thought with a list of its contexts from the thoughtIndex by id. */
export const getLexemeById = (state: State, key: string): Lexeme | undefined => state.thoughts.thoughtIndex[key]

/** Gets a single thought with a list of its contexts from the thoughtIndex. */
export const getLexeme = (state: State, value: string): Lexeme | undefined =>
  state.thoughts.thoughtIndex[hashThought(value)]

export default getLexeme
