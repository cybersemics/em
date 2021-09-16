import { Parent, State } from '../@types'
import { childIdsToThoughts } from '../selectors'

/**
 * Tests if the given childIds match the expected thoughts.
 */
const matchChildIdsWithThoughts = (state: State, path: string[], expectedThoughts: Partial<Parent>[]) => {
  const thoughts = childIdsToThoughts(state, path)
  expect(thoughts).toMatchObject(expectedThoughts)
}

export default matchChildIdsWithThoughts
