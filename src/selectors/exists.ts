import { getLexeme } from '../selectors'
import { State } from '../util/initialState'

/** Returns true if the head of the given context exists in the thoughtIndex. */
const exists = (state: State, value: string) => value != null && !!getLexeme(state, value)

export default exists
