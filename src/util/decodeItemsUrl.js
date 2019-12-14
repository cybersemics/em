import {
  ROOT_TOKEN,
} from '../constants.js'

// util
import { componentToItem } from './componentToItem.js'
import { hashContext } from './hashContext.js'
import { rankItemsFirstMatch } from './rankItemsFirstMatch.js'

/**
 * parses the items from the url
 * @return { items, contextViews }
 */
// declare using traditional function syntax so it is hoisted
export const decodeItemsUrl = (pathname, thoughtIndex) => {
  const urlPath = pathname.slice(1)
  const urlComponents = urlPath ? urlPath.split('/') : [ROOT_TOKEN]
  const pathUnranked = urlComponents.map(componentToItem)
  const contextViews = urlComponents.reduce((accum, cur, i) =>
    /~$/.test(cur) ? Object.assign({}, accum, {
      [hashContext(pathUnranked.slice(0, i + 1))]: true
    }) : accum,
  {})
  const itemsRanked = rankItemsFirstMatch(pathUnranked, { state: { thoughtIndex, contextViews } })
  return {
    // infer ranks of url path so that url can be /A/a1 instead of /A_0/a1_0 etc
    itemsRanked, // : rankItemsFirstMatch(pathUnranked, thoughtIndex, contextViews),
    contextViews
  }
}
