import {
  getSetting,
} from '../util.js'

// util
/** Returns true if the tutorial is active. */
export const isTutorial = state => getSetting('Tutorial', state)[0] === 'On'
