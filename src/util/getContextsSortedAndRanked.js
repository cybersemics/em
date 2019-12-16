import { store } from '../store.js'

// util
import { makeCompareByProp } from './makeCompareByProp.js'
import { getContexts } from './getContexts.js'

export const getContextsSortedAndRanked = (value, thoughtIndex = store.getState().thoughtIndex) =>
  getContexts(value, thoughtIndex) // eslint-disable-line fp/no-mutating-methods
    // sort
    .sort(makeCompareByProp('context'))
    // generate dynamic ranks
    .map((thought, i) => ({
      context: thought.context,
      rank: i
    }))
