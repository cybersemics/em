import { store } from '../store.js'
import {
  GETCHILDRENWITHRANK_VALIDATION_FREQUENCY,
} from '../constants.js'

// util
import { unrank } from './unrank.js'
import { hashContext } from './hashContext.js'
import { equalThoughtsRanked } from './equalThoughtsRanked.js'
import { compareByRank } from './compareByRank.js'
import { getChildrenWithRankDEPRECATED } from './getChildrenWithRankDEPRECATED.js'
import { getThought } from './getThought.js'

/** Generates children with their ranking. */
// TODO: cache for performance, especially of the app stays read-only
export const getChildrenWithRank = (thoughtsRanked, thoughtIndex, contextIndex) => {
  thoughtIndex = thoughtIndex || store.getState().thoughtIndex
  contextIndex = contextIndex || store.getState().contextIndex
  const children = (contextIndex[hashContext(unrank(thoughtsRanked))] || []) // eslint-disable-line fp/no-mutating-methods
    .filter(child => {
      if (getThought(child.key, thoughtIndex)) {
        return true
      }
      else {
        // TODO: This should never happen
        // console.warn(`Could not find item thoughtIndex for "${child.key} in ${JSON.stringify(unrank(thoughtsRanked))}`)

        // Mitigation (does not remove thoughtIndex items)
        // setTimeout(() => {
        //   if (store) {
        //     const state = store.getState()
        //     // check again in case state has changed
        //     if (!getThought(child.key, state.thoughtIndex)) {
        //       const contextEncoded = hashContext(unrank(thoughtsRanked))
        //       store.dispatch({
        //         type: 'thoughtIndex',
        //         contextIndexUpdates: {
        //           [contextEncoded]: (state.contextIndex[contextEncoded] || [])
        //             .filter(child2 => child2.key !== child.key)
        //         }
        //       })
        //     }
        //   }
        // })
        return false
      }
    })
    .map(child => {
      const animateCharsVisible = getThought(child.key, thoughtIndex).animateCharsVisible
      return animateCharsVisible != null
        ? Object.assign({}, child, { animateCharsVisible })
        : child
    })
    .sort(compareByRank)

  const validateGetChildrenDeprecated = Math.random() < GETCHILDRENWITHRANK_VALIDATION_FREQUENCY
  const childrenDEPRECATED = validateGetChildrenDeprecated ? getChildrenWithRankDEPRECATED(unrank(thoughtsRanked), thoughtIndex) : undefined

  // compare with legacy function a percentage of the time to not affect performance
  if (validateGetChildrenDeprecated && !equalThoughtsRanked(children, childrenDEPRECATED)) {
    console.warn(`getChildrenWithRank returning different result from getChildrenWithRankDEPRECATED for children of ${JSON.stringify(unrank(thoughtsRanked))}`)
    console.warn({ children })
    console.warn({ childrenDEPRECATED })
  }

  return children
}
