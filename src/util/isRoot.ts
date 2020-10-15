import { ROOT_TOKEN } from '../constants'
import { Child, ThoughtContext } from '../types'

/** Returns true if the thoughts or thoughtsRanked is the root thought. */
export const isRoot = (thoughts: (string | Child | ThoughtContext)[]): boolean =>
  thoughts.length === 1 &&
  !!thoughts[0] &&
  (
    (thoughts[0] as Child).value === ROOT_TOKEN ||
    (thoughts[0] as string) === ROOT_TOKEN ||
    ((thoughts[0] as ThoughtContext).context && isRoot((thoughts[0] as ThoughtContext).context))
  )
