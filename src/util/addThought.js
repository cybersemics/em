import { store } from '../store'

// util
import { timestamp } from './timestamp'
import { getThought } from '../selectors'

/** Create a new thought, merging collisions. */
export const addThought = ({ thoughtIndex = store.getState().thoughtIndex, value, rank, context }) => {
  const thoughtOld = getThought(store.getState(), value)
  return {
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
  }
}
