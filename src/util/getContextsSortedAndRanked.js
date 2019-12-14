import { store } from '../store.js'

// util
import { makeCompareByProp } from './makeCompareByProp.js'
import { getContexts } from './getContexts.js'

export const getContextsSortedAndRanked = (key, data = store.getState().data) =>
  getContexts(key, data) // eslint-disable-line fp/no-mutating-methods
    // sort
    .sort(makeCompareByProp('context'))
    // generate dynamic ranks
    .map((item, i) => ({
      context: item.context,
      rank: i
    }))
