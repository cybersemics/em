import getSetting from '../selectors/getSetting'
import State from '../@types/State'

/** Returns true if the tutorial is active. */
const isTutorial = (state: State) => getSetting(state, 'Tutorial') !== 'Off'

export default isTutorial
