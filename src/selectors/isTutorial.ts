import { getSetting } from '../selectors'
import { State } from '../util/initialState'

/** Returns true if the tutorial is active. */
export default (state: State) => getSetting(state, 'Tutorial') === 'On'
