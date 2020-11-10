import { timestamp } from './timestamp'
import { getThought } from '../selectors'
import { Context } from '../types'
import { State } from './initialState'

/** Create a new thought, merging collisions. */
export const addThought = (state: State, value: string, rank: number, context: Context, lastUpdated = timestamp()) => {
  const thoughtOld = getThought(state, value)
  return {
    ...thoughtOld,
    value,
    contexts: (thoughtOld
      ? thoughtOld.contexts || []
      : []
    ).concat({
      context,
      rank,
    }),
    created: thoughtOld && thoughtOld.created
      ? thoughtOld.created
      : lastUpdated,
    lastUpdated,
  }
}
