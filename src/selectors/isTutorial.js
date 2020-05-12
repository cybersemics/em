import {
  getSetting,
} from '../selectors'

// util
/** Returns true if the tutorial is active. */
export default state => getSetting(state, 'Tutorial') === 'On'
