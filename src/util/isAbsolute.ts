import { ABSOLUTE_TOKEN } from '../constants'
import { Child, ThoughtContext } from '../types'

/** Returns true if the thoughts or path is the absolute context. */
export const isAbsolute = (thoughts: (string | Child | ThoughtContext)[]): boolean => {
  return thoughts.length === 1 &&
  !!thoughts[0] &&
  (
    (thoughts[0] as Child).value === ABSOLUTE_TOKEN ||
    (thoughts[0] as string) === ABSOLUTE_TOKEN ||
    ((thoughts[0] as ThoughtContext).context && isAbsolute((thoughts[0] as ThoughtContext).context))
  )
}
