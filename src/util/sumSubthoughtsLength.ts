import Thought from '../@types/Thought'
import State from '../@types/State'

/** Sums the length of all thoughts in the list of thoughts. */
// works on children with key or context
const sumSubthoughtsLength = (state: State, children: Thought[]) =>
  children.reduce((accum, child) => accum + child.value.length, 0)

export default sumSubthoughtsLength
