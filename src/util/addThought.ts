// util
import { timestamp } from './timestamp'
import { getThought } from '../selectors'
import { Context, Timestamp } from '../types'
import { State } from './initialState'

/** Create a new thought, merging collisions. */
export const addThought = (state: State, value: string, rank: number, id: string, context: Context, created: Timestamp = timestamp(), lastUpdated: Timestamp = timestamp()) => {
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
      id
    }),
    created: thoughtOld?.created || created,
    lastUpdated
  }
}
