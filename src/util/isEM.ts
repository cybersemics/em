import { EM_TOKEN } from '../constants'
import { Path } from '../types'

/** Returns true if the Path is the EM_TOKEN. */
export const isEM = (thoughts: Path): boolean =>
  thoughts.length === 1 &&
  !!thoughts[0] &&
  thoughts[0].value === EM_TOKEN
