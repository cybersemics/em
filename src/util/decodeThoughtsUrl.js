import {
  ROOT_TOKEN,
} from '../constants.js'

// util
// import { componentToThought } from './componentToThought.js'
import { hashContext } from './hashContext.js'
import { rankThoughtsFirstMatch } from './rankThoughtsFirstMatch.js'

/**
 * parses the thoughts from the url
 * @return { thoughts, contextViews }
 */
// declare using traditional function syntax so it is hoisted
export const decodeThoughtsUrl = (pathname, thoughtIndex, contextIndex) => {
  const urlPath = pathname.slice(1)
  const urlComponents = urlPath ? urlPath.split('/') : [ROOT_TOKEN]
  const pathUnranked = urlComponents.map(component => window.decodeURIComponent((window.decodeURIComponent(component.replace(/~$/, '')))))
  const contextViews = urlComponents.reduce((accum, cur, i) =>
    /~$/.test(cur) ? Object.assign({}, accum, {
      [hashContext(pathUnranked.slice(0, i + 1))]: true
    }) : accum,
  {})
  const thoughtsRanked = rankThoughtsFirstMatch(pathUnranked, { state: { thoughtIndex, contextIndex, contextViews } })
  return {
    // infer ranks of url path so that url can be /A/a1 instead of /A_0/a1_0 etc
    thoughtsRanked, // : rankThoughtsFirstMatch(pathUnranked, thoughtIndex, contextViews),
    contextViews
  }
}
