import { Context, Path } from '../types'

/** Checks if the param is of type path. */
const isPath = (o: Context | Path): o is Path =>
  o.length > 0 && Object.prototype.hasOwnProperty.call(o[0], 'value')

/** Converts paths [{ value, rank }, ...] to contexts [key, ...].
 * If already converted, return a shallow copy.
 * If falsey, return as-is.
 */
export const pathToContext = (thoughts: Context | Path): Context =>
  thoughts
    ? isPath(thoughts) ? thoughts.map(child => child.value) : thoughts.slice()
    : thoughts
