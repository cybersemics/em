import {
  ROOT_TOKEN,
} from '../constants.js'

// util
import { componentToThought } from './componentToThought.js'
import { rankThoughtsFirstMatch } from './rankThoughtsFirstMatch.js'

/**
 * parses the thoughts from the url
 * @return { thoughts, contextViews }
 */
// declare using traditional function syntax so it is hoisted
export const decodeThoughtsUrl = (pathname, thoughtIndex, contextIndex) => {
  const urlPath = pathname.slice(1)
  const urlComponents = urlPath ? urlPath.split('/') : [ROOT_TOKEN]
  const pathUnranked = urlComponents.map(componentToThought)
  const contextViews = urlComponents.reduce(accum => accum, {})
  const thoughtsRanked = rankThoughtsFirstMatch(pathUnranked, { state: { thoughtIndex, contextIndex, contextViews } })
  return {
    // infer ranks of url path so that url can be /A/a1 instead of /A_0/a1_0 etc
    thoughtsRanked, // : rankThoughtsFirstMatch(pathUnranked, thoughtIndex, contextViews),
    contextViews
  }
}
