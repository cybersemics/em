import { store } from '../store.js'
import {
  GETCHILDRENWITHRANK_VALIDATION_FREQUENCY,
} from '../constants.js'

// util
import { compareByRank } from './compareByRank.js'
import { equalPath } from './equalPath.js'
import { getChildrenWithRankDEPRECATED } from './getChildrenWithRankDEPRECATED.js'
import { getThought } from './getThought.js'
import { hashContext } from './hashContext.js'
import { pathToContext } from './pathToContext.js'

/** Generates children with their ranking. */
// TODO: cache for performance, especially of the app stays read-only
export const getChildrenWithRank = (context, thoughtIndex, contextIndex) => {
  thoughtIndex = thoughtIndex || store.getState().thoughtIndex
  contextIndex = contextIndex || store.getState().contextIndex
  const children = (contextIndex[hashContext(context)] || []) // eslint-disable-line fp/no-mutating-methods
    .filter(child => {
      if (getThought(child.key, thoughtIndex)) {
        return true
      }
      else {
        // TODO: This should never happen
        // console.warn(`Could not find thought thoughtIndex for "${child.key} in ${JSON.stringify(pathToContext(context))}`)

        // Mitigation (does not remove thoughtIndex thoughts)
        // setTimeout(() => {
        //   if (store) {
        //     const state = store.getState()
        //     // check again in case state has changed
        //     if (!getThought(child.key, state.thoughtIndex)) {
        //       const contextEncoded = hashContext(context)
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
  const childrenDEPRECATED = validateGetChildrenDeprecated ? getChildrenWithRankDEPRECATED(pathToContext(context), thoughtIndex) : undefined

  // compare with legacy function a percentage of the time to not affect performance
  if (validateGetChildrenDeprecated && !equalPath(children, childrenDEPRECATED)) {
    console.warn(`getChildrenWithRank returning different result from getChildrenWithRankDEPRECATED for children of ${JSON.stringify(pathToContext(context))}`)
    console.warn({ children })
    console.warn({ childrenDEPRECATED })
  }

  return children
}
