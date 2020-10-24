import { RANKED_ROOT, ROOT_TOKEN } from '../constants'
import { parentOf } from '../util'
import { Context, Path } from '../types'

/** Checks if an object is of type Path. */
const isPath = (o: Context | Path): o is Path =>
  o.length > 0 && Object.prototype.hasOwnProperty.call(o[0], 'value')

/** Get the parentOf of thoughts or [ROOT_TOKEN] if there are none. */
export const rootedContextOf = <T extends Context | Path>(thoughts: T): T =>
  thoughts && thoughts.length > 1
    ? parentOf(thoughts) as T
    : isPath(thoughts)
      ? RANKED_ROOT as unknown as T
      : [ROOT_TOKEN] as T
