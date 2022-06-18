import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import getDescendantThoughtIds from '../selectors/getDescendantThoughtIds'

/** Returns true if any descendants of a thought fulfills the predicate. Short circuits once found. */
const someDescendants = (state: State, id: ThoughtId, predicate: (thought: Thought) => boolean) => {
  let found = false
  // ignore the return value of getDescendants
  // we are just using its filterFunction to check pending
  getDescendantThoughtIds(state, id, {
    filterFunction: thought => {
      if (predicate(thought)) {
        found = true
      }
      // if thought has been found, return false to filter out all remaining children and short circuit
      return !found
    },
  })

  return found
}

export default someDescendants
