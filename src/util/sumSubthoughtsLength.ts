import { Child, State, ThoughtContext } from '../@types'

/** Sums the length of all thoughts in the list of thoughts. */
// works on children with key or context
export const sumSubthoughtsLength = (state: State, children: (Child | ThoughtContext)[]) =>
  children.reduce(
    (accum, child) =>
      accum +
      ('value' in child
        ? (child as Child).value.length
        : state.thoughts.contextIndex[(child as ThoughtContext).id]?.value.length || 0),
    0,
  )
