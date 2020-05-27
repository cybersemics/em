import { Context, Path } from "../types"

/** Converts paths [{ value, rank }, ...] to contexts [key, ...]. */
// if already converted, return a shallow copy
// if falsey, return as-is

const isPath = (param: any): param is Path =>  !!(param as Path).length && (param as Path)[0].hasOwnProperty('value')
export const pathToContext = (thoughts: Path | Context): Context  => isPath(thoughts) ? thoughts.map(child => child.value) : thoughts.slice()