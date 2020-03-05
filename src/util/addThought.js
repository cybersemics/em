import { store } from '../store.js'

// util
import { timestamp } from './timestamp.js'
import { getThought } from './getThought.js'

/** Create a new thought, merging collisions. */
export const addThought = ({ thoughtIndex = store.getState().thoughtIndex, value, rank, context }) => {
  const thoughtOld = getThought(value, thoughtIndex)
  return ({
    ...thoughtOld,
    value,
    contexts: (thoughtOld
      ? thoughtOld.contexts || []
      : []
    ).concat({
      context,
      rank
    }),
    created: thoughtOld && thoughtOld.created
      ? thoughtOld.created
      : timestamp(),
    lastUpdated: timestamp()
  })
}
