import {
  getSetting,
} from '../util.js'

// util
/** Returns true if the tutorial is active. */
export const isTutorial = () => getSetting('Tutorial')[0] === 'On'
