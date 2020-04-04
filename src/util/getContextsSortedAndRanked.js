import { store } from '../store.js'

// util
import { getContexts } from './getContexts.js'
import { makeCompareByProp } from './makeCompareByProp.js'
import { sort } from './sort.js'

export const getContextsSortedAndRanked = (value, thoughtIndex = store.getState().thoughtIndex) =>
  sort(
    getContexts(value, thoughtIndex),
    // sort
    makeCompareByProp('context')
  )
    // generate dynamic ranks
    .map((thought, i) => ({
      context: thought.context,
      rank: i
    }))
