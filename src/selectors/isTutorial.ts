import { State } from '../@types'
import { getSetting } from '../selectors'

/** Returns true if the tutorial is active. */
const isTutorial = (state: State) => getSetting(state, 'Tutorial') !== 'Off'

export default isTutorial
