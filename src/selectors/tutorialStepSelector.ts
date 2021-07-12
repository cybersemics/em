import { State } from '../util/initialState'
import getSetting from './getSetting'

/** TutorialStepSelector. */
const tutorialStepSelector = (state: State) => +(getSetting(state, 'Tutorial Step') || 1)

export default tutorialStepSelector
