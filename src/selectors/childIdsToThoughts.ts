import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtReaderState from '../@types/ThoughtReaderState'
import getThoughtById from '../selectors/getThoughtById'

/** Converts a list of ThoughtIds to a list of Thoughts. May return a smaller list if any thoughts are missing. */
const childIdsToThoughts = (state: ThoughtReaderState, childIds: readonly ThoughtId[]): Thought[] => {
  const thoughts = []
  for (let i = 0; i < childIds.length; i++) {
    const thought = getThoughtById(state, childIds[i])
    if (thought) {
      thoughts.push(thought)
    }
  }
  return thoughts
}

export default childIdsToThoughts
