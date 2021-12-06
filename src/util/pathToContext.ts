import { Context, Path, State } from '../@types'
import { getThoughtById } from '../selectors'

/** Converts a Path to a Context. */
export const pathToContext = (state: State, path: Path): Context =>
  path.map(child => {
    const thought = getThoughtById(state, child)
    if (!thought) throw Error('pathToContext: ')
    return thought.value
  })
