import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import childIdsToThoughts from '../selectors/childIdsToThoughts'

/**
 * Tests if the given childIds match the expected thoughts. Accepts a { value, rank }[] or string[].
 */
const expectPathToEqual = (state: State, path: Path | null, expectedThoughts: (Partial<Thought> | string)[]) => {
  expect(path).not.toEqual(null)
  const thoughts = childIdsToThoughts(state, path!)
  const thoughtsNormalized = thoughts.map(({ value, rank }) =>
    typeof expectedThoughts[0] === 'string' ? value : { value, rank },
  )
  expect(thoughtsNormalized).toMatchObject(expectedThoughts)
}

export default expectPathToEqual
