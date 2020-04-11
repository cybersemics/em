import {
  getSetting,
} from '../selectors'

// util
/** Returns true if the tutorial is active. */
export const isTutorial = state => getSetting(state, 'Tutorial') === 'On'
