import { getLexeme } from '../selectors'
import { State } from '../@types'

/** Returns true if a Lexeme for the given value exists in the lexemeIndex. */
const hasLexeme = (state: State, value: string) => value != null && !!getLexeme(state, value)

export default hasLexeme
