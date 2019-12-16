import {
  ROOT_TOKEN,
} from '../constants.js'

// util
/** Returns true if the thoughts or thoughtsRanked is the root thought. */
// declare using traditional function syntax so it is hoisted
export const isRoot = thoughts =>
  thoughts.length === 1 && thoughts[0] && (thoughts[0].value === ROOT_TOKEN || thoughts[0] === ROOT_TOKEN || (thoughts[0].context && isRoot(thoughts[0].context)))
