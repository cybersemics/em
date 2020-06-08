import { Context, Path } from '../types'

/** Checks if an object is of type Path. */
const isPath = (o: Context | Path): o is Path =>
  o.length > 0 && Object.prototype.hasOwnProperty.call(o[0], 'value')

/** Converts a Path to a Context.
 * If already converted, return a shallow copy.
 * If falsey, return as-is.
 */
export const pathToContext = (thoughts: Context | Path): Context =>
  thoughts
    ? isPath(thoughts) ? thoughts.map(child => child.value) : [...thoughts]
    : thoughts
