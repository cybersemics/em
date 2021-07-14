import { State } from '../@types'
import { getLexeme } from '../selectors'

/** Returns true if a Lexeme for the given value exists in the thoughtIndex. */
const hasLexeme = (state: State, value: string) => value != null && !!getLexeme(state, value)

export default hasLexeme
