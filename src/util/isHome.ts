import { HOME_TOKEN } from '../constants'
import { Child, ThoughtContext } from '../types'

/** Returns true if the thoughts or path is the home root. */
export const isHome = (thoughts: (string | Child | ThoughtContext)[]): boolean => {
  return thoughts.length === 1 &&
  !!thoughts[0] &&
  (
    (thoughts[0] as Child).value === HOME_TOKEN ||
    (thoughts[0] as string) === HOME_TOKEN ||
    ((thoughts[0] as ThoughtContext).context && isHome((thoughts[0] as ThoughtContext).context))
  )
}
