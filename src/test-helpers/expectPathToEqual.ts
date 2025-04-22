import Path from '../@types/Path'
import State from '../@types/State'
import childIdsToThoughts from '../selectors/childIdsToThoughts'

/** Test a Path in a readable way by converting it to a list of thought values. */
const expectPathToEqual = (state: State, path: Path | null, context: string[]) => {
  expect(path).not.toEqual(null)
  const values = childIdsToThoughts(state, path!).map(thought => thought.value)
  expect(values).toEqual(context)
}

export default expectPathToEqual
