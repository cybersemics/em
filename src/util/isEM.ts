import { EM_TOKEN } from '../constants'
import { Context, Path } from '../types'
import { isPath } from './isPath'

/** Returns true if the Path is the EM_TOKEN. */
export const isEM = (thoughts: Context | Path): boolean =>
  thoughts.length === 1 &&
  (isPath(thoughts) ?
    thoughts[0].value === EM_TOKEN :
    thoughts[0] === EM_TOKEN
  )
