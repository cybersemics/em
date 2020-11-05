import { EM_TOKEN } from '../constants'
import { Path } from '../types'

/** Returns true if the Path is the EM_TOKEN. */
export const isEM = (path: Path): boolean =>
  path.length === 1 &&
  !!path[0] &&
  path[0].value === EM_TOKEN
