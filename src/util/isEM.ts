import { EM_TOKEN } from '../constants'
import { Child } from '../types'

/** Returns true if the Path is the EM_TOKEN. */
export const isEM = (thoughts: (string | Child)[]): boolean =>
  thoughts.length === 1 &&
  !!thoughts[0] &&
  (
    (thoughts[0] as Child).value === EM_TOKEN ||
    (thoughts[0] as string) === EM_TOKEN
  )
