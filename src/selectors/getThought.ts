import { hashThought } from '../util'
import { State } from '../util/initialState'
import { Lexeme } from '../types'

/** Gets a single thought with a list of its contexts from the thoughtIndex. */
export const getThought = ({ thoughts: { thoughtIndex } }: State, value: string): Lexeme =>
  thoughtIndex[hashThought(value)]

export default getThought
