import { ROOT_CONTEXTS } from '../constants'
import { Child, ThoughtContext } from '../types'

/** Returns true if the thoughts or path is the root context. */
export const isRoot = (thoughts: (string | Child | ThoughtContext)[]): boolean => {
  return thoughts.length === 1 &&
  !!thoughts[0] &&
  (
    ROOT_CONTEXTS.includes((thoughts[0] as Child).value) ||
    ROOT_CONTEXTS.includes(thoughts[0] as string) ||
    ((thoughts[0] as ThoughtContext).context && isRoot((thoughts[0] as ThoughtContext).context))
  )
}
