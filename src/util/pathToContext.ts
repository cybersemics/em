import { Context, Path, State } from '../@types'
import { getThoughtById } from '../selectors'

/** Converts a Path to a Context. */
export const pathToContext = (state: State, path: Path): Context =>
  path.map(id => {
    const thought = getThoughtById(state, id)
    if (!thought) throw Error('pathToContext: Missing thought with id ' + id)
    return thought.value
  })
