import { Context, Path } from '../types'

/** Converts a Path to a Context. */
export const pathToContext = (path: Path): Context =>
  path.map(child => child.value)
