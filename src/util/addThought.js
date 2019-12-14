import { store } from '../store.js'

// util
import { timestamp } from './timestamp.js'
import { getThought } from './getThought.js'

/** Create a new thought, merging collisions. */
export const addThought = ({ thoughtIndex = store.getState().thoughtIndex, value, rank, context }) =>
  Object.assign({}, getThought(value, thoughtIndex), {
    value: value,
    memberOf: (value in thoughtIndex && getThought(value, thoughtIndex) && getThought(value, thoughtIndex).memberOf ? getThought(value, thoughtIndex).memberOf : []).concat({
      context,
      rank
    }),
    created: timestamp(),
    lastUpdated: timestamp()
  })
