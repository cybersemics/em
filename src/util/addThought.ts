import { store } from '../store'

// util
import { timestamp } from './timestamp'
import { getThought } from '../selectors'
import { Context } from '../types'
import { InitialStateInterface } from './initialState'

/** Create a new thought, merging collisions. */
export const addThought = (state: InitialStateInterface, value: string, rank: number, context: Context) => {
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
