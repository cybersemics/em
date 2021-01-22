import { Context, Path } from '../types'

/** Checks if an object is of type Path. */
export const isPath = (o: Context | Path): o is Path =>
  o.length > 0 && Object.prototype.hasOwnProperty.call(o[0], 'value')
