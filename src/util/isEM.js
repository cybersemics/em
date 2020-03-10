import {
  EM_TOKEN,
} from '../constants.js'

/** Returns true if the thoughts or thoughtsRanked is the EM_TOKEN. */
// declare using traditional function syntax so it is hoisted
export const isEM = thoughts =>
  thoughts.length === 1 && thoughts[0] && (thoughts[0].value === EM_TOKEN || thoughts[0] === EM_TOKEN || (thoughts[0].context && isEM(thoughts[0].context)))
