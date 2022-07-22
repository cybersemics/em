import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import childIdsToThoughts from '../selectors/childIdsToThoughts'

/**
 * Tests if the given childIds match the expected thoughts. Accepts a { value, rank }[] or string[].
 */
const expectPathToEqual = (state: State, path: ThoughtId[] | null, expectedThoughts: (Partial<Thought> | string)[]) => {
  if (!path) return false
  // const expected =
  //   typeof expectedThoughts[0] === 'string' ? expectedThoughts.map(value => ({ value })) : expectedThoughts
  const thoughts = childIdsToThoughts(state, path)
  const thoughtsNormalized = thoughts.map(({ value, rank }) =>
    typeof expectedThoughts[0] === 'string' ? value : { value, rank },
  )
  expect(thoughtsNormalized).toMatchObject(expectedThoughts)
}

export default expectPathToEqual
