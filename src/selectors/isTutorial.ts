import State from '../@types/State'
import getSetting from '../selectors/getSetting'

/** Returns true if the tutorial is active. */
const isTutorial = (state: State) => getSetting(state, 'Tutorial') !== 'Off'

export default isTutorial
