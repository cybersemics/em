import { store } from '../store.js'

// util
import { compareByRank } from './compareByRank.js'
import { equalArrays } from './equalArrays.js'
import { flatMap } from './flatMap.js'
import { getThought } from './getThought.js'

// preserved for testing functional parity with new function
/** Generates children with their ranking. */
// TODO: cache for performance, especially of the app stays read-only
export const getChildrenWithRankDEPRECATED = (thoughts, thoughtIndex) => {
  thoughtIndex = thoughtIndex || store.getState().thoughtIndex
  return flatMap(Object.keys(thoughtIndex), key => // eslint-disable-line fp/no-mutating-methods
    ((getThought(key, thoughtIndex) || []).contexts || [])
      .map(member => {
        if (!member) {
          throw new Error(`Key "${key}" has  null parent`)
        }
        return {
          key,
          rank: member.rank || 0,
          isMatch: equalArrays(thoughts, member.context || member)
        }
      })
    )
    // filter out non-matches
    .filter(match => match.isMatch)
    // remove isMatch attribute
    .map(({ value, rank }) => ({
      value,
      rank
    }))
    // sort by rank
    .sort(compareByRank)
}
