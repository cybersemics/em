import { Context, Path, State } from '../@types'

/** Converts a Path to a Context. */
export const pathToContext = (state: State, path: Path): Context =>
  path.map(child => {
    const thought = state.thoughts.contextIndex[child]
    if (!thought) throw Error('pathToContext: ')
    return thought.value
  })
