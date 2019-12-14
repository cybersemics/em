import { store } from '../store.js'

// util
import { timestamp } from './timestamp.js'
import { getThought } from './getThought.js'

/** Create a new item, merging collisions. */
export const addItem = ({ data = store.getState().data, value, rank, context }) =>
  Object.assign({}, getThought(value, data), {
    value: value,
    memberOf: (value in data && getThought(value, data) && getThought(value, data).memberOf ? getThought(value, data).memberOf : []).concat({
      context,
      rank
    }),
    created: timestamp(),
    lastUpdated: timestamp()
  })
