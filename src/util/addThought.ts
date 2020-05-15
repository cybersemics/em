//@ts-nocheck

import { store } from '../store'

// util
import { timestamp } from './timestamp'
import { getThought } from '../selectors'

/** Create a new thought, merging collisions. */
export const addThought = (state, value, rank, context) => {
  const thoughtOld = getThought(state, value)
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
