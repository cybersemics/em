import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import newThought from '../reducers/newThought'
import reducerFlow from '../util/reducerFlow'
import strip from '../util/strip'

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
