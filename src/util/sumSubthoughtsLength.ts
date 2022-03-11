import { Thought, State } from '../@types'

/** Sums the length of all thoughts in the list of thoughts. */
// works on children with key or context
export const sumSubthoughtsLength = (state: State, children: Thought[]) =>
  children.reduce((accum, child) => accum + child.value.length, 0)
