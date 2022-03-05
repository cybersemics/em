import { hashThought } from '../util'
import { Lexeme, State } from '../@types'

/** Gets a single thought with a list of its contexts from the lexemeIndex by id. */
export const getLexemeById = (state: State, key: string): Lexeme | undefined => state.thoughts.lexemeIndex[key]

/** Gets a single thought with a list of its contexts from the lexemeIndex. */
export const getLexeme = (state: State, value: string): Lexeme | undefined =>
  state.thoughts.lexemeIndex[hashThought(value)]

export default getLexeme
