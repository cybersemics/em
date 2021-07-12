import { State } from '../util/initialState'

/** Authenticated. */
const authenticatedSelector = (state: State) => state.authenticated

export default authenticatedSelector
