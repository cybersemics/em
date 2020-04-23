import {
  getSetting,
} from '../util'

// util
/** Returns true if the tutorial is active. */
export const isTutorial = state => getSetting('Tutorial', state) === 'On'
