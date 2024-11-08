import State from '../@types/State'
import getLexeme from '../selectors/getLexeme'

/** Returns true if a Lexeme for the given value exists in the lexemeIndex. */
const hasLexeme = (state: State, value: string) => value != null && !!getLexeme(state, value)

export default hasLexeme
