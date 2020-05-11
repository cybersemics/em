import { store } from '../store'

// util
import { timestamp } from './timestamp'
import { getThought } from './getThought'

/** Create a new thought, merging collisions. */
export const addThought = ({ thoughtIndex = store.getState().thoughtIndex, value, rank, context }) => {
  const thoughtOld = getThought(value, thoughtIndex)
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
