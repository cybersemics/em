import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, ROOT_PARENT_ID } from '../constants'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import { pullActionCreator as pull } from './pull'

/** A set of all four root contexts. */
const rootContextSet = new Set<ThoughtId>([ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, ROOT_PARENT_ID])

/** An action-creator that pulls the ancestors of one or more thoughts (inclusive). */
export const pullAncestorsActionCreator = (
  ids: ThoughtId[],
  { force, maxDepth }: { force?: boolean; maxDepth?: number } = {},
): Thunk<Promise<void>> => {
  let queue = [...ids]
  return async (dispatch, getState) => {
    // pull all ancestors so that breadcrumbs can be displayed
    while (queue.length > 0) {
      await dispatch(pull(queue, { force, maxDepth }))

      // enqueue parents
      const thoughts = childIdsToThoughts(getState(), queue)
      queue = thoughts.map(thought => thought.parentId).filter(id => !rootContextSet.has(id))
    }
  }
}
