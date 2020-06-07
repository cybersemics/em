import {
  ROOT_TOKEN,
} from '../constants'

// util
import { componentToThought, hashContext } from '../util'

// selectors
import { rankThoughtsFirstMatch } from '../selectors'

/** Parses the thoughts from the url. */
export default (state, pathname) => {
  const urlPathname = pathname.slice(1)
  const urlComponents = urlPathname.split('/')
  const userId = urlComponents[0] || '~' // ~ represents currently authenticated user
  const urlPath = urlComponents.length > 1 ? urlComponents.slice(1) : [ROOT_TOKEN]
  const pathUnranked = urlPath.map(componentToThought)
  const contextViews = urlPath.reduce((accum, cur, i) =>
    /~$/.test(cur) ? {
      ...accum,
      [hashContext(pathUnranked.slice(0, i + 1))]: true
    } : accum,
  {})
  const thoughtsRanked = rankThoughtsFirstMatch({ ...state, contextViews }, pathUnranked)
  return {
    // infer ranks of url path so that url can be /A/a1 instead of /A_0/a1_0 etc
    thoughtsRanked, // : rankThoughtsFirstMatch(pathUnranked, thoughtIndex, contextViews),
    contextViews,
    userId,
  }
}
