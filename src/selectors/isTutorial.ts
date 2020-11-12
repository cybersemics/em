import { getSetting } from '../selectors'
import { State } from '../util/initialState'

/** Returns true if the tutorial is active. */
const isTutorial = (state: State) => getSetting(state, 'Tutorial') !== 'Off'

export default isTutorial
