import Path from '../@types/Path'
import State from '../@types/State'
import pathToContext from '../util/pathToContext'

/** Test a Path in a readable way by converting it to the values the user sees at each step. A context step contributes the value of the context, not of the Lexeme context it lands on, so a/m~/b is asserted as ['a', 'm', 'b']. */
const expectPathToEqual = (state: State, path: Path | null, context: string[]) => {
  expect(path).not.toEqual(null)
  expect(pathToContext(state, path!)).toEqual(context)
}

export default expectPathToEqual
