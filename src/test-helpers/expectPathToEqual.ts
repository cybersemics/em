import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import childIdsToThoughts from '../selectors/childIdsToThoughts'

/**
 * Tests if the given childIds match the expected thoughts.
 */
const expectPathToEqual = (state: State, path: ThoughtId[], expectedThoughts: Partial<Thought>[]) => {
  const thoughts = childIdsToThoughts(state, path)
  expect(thoughts).toMatchObject(expectedThoughts)
}

export default expectPathToEqual
