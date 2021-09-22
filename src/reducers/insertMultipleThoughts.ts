import { reducerFlow } from '../util/reducerFlow'
import { strip } from '../util/strip'
import newThought from '../reducers/newThought'
import { SimplePath, State } from '../@types'

/** Atomically insert multiple new thoughts. Removes empty lines. */
const insertMultipleThoughts = (state: State, { simplePath, lines }: { simplePath: SimplePath; lines: string[] }) =>
  reducerFlow(
    lines
      // strip lines
      .map(line => strip(line))
      // filter out empty lines
      .filter(x => x)
      // insert new thought
      .map(line => (state: State) => newThought(state, { value: line })),
  )(state)

export default insertMultipleThoughts
