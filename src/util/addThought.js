import { store } from '../store.js'

// util
import { timestamp } from './timestamp.js'
import { getThought } from './getThought.js'

/** Create a new thought, merging collisions. */
export const addThought = ({ thoughtIndex = store.getState().thoughtIndex, value, rank, context }) =>
  Object.assign({}, getThought(value, thoughtIndex), {
    value: value,
    contexts: (value in thoughtIndex && getThought(value, thoughtIndex) && getThought(value, thoughtIndex).contexts ? getThought(value, thoughtIndex).contexts : []).concat({
      context,
      rank
    }),
    created: timestamp(),
    lastUpdated: timestamp()
  })
