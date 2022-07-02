import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import getThoughtById from '../selectors/getThoughtById'

/** Converts a list of ThoughtIds to a list of Thoughts. May return a smaller list if any thoughts are missing. */
const childIdsToThoughts = (state: State, childIds: ThoughtId[]): Thought[] => {
  const thoughts = []
  // eslint-disable-next-line fp/no-loops
  for (let i = 0; i < childIds.length; i++) {
    const thought = getThoughtById(state, childIds[i])
    if (thought) {
      // eslint-disable-next-line fp/no-mutating-methods
      thoughts.push(thought)
    }
  }
  return thoughts
}

export default childIdsToThoughts
