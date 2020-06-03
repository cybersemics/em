import { Context, Path } from '../types'

/** Checks if the param is of type path. */
// eslint-disable-next-line no-extra-parens
const isPath = (param: any): param is Path => !!(param as Path).length && Object.prototype.hasOwnProperty.call((param as Path)[0], 'value')
/** Converts paths [{ value, rank }, ...] to contexts [key, ...]. */
// if already converted, return a shallow copy
// if falsey, return as-is
export const pathToContext = (thoughts: Path | Context): Context => isPath(thoughts) ? thoughts.map(child => child.value) : thoughts.slice()
