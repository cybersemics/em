// util
import { timestamp } from './timestamp'
import { getThought } from '../selectors'
import { Context } from '../types'
import { PartialStateWithThoughts } from './initialState'

/** Create a new thought, merging collisions. */
export const addThought = (state: PartialStateWithThoughts, value: string, rank: number, id: string, context: Context) => {
  const thoughtOld = getThought(state, value)
  return {
    ...thoughtOld,
    value,
    id,
    contexts: (thoughtOld
      ? thoughtOld.contexts || []
      : []
    ).concat({
      context,
      rank,
    }),
    created: thoughtOld && thoughtOld.created
      ? thoughtOld.created
      : timestamp(),
    lastUpdated: timestamp()
  }
}
