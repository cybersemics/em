import { ROOT_CONTEXTS } from '../constants'
import { ThoughtId } from '../@types'

/** Returns true if the thoughts or path is the root context. */
export const isRoot = (thoughts: (string | ThoughtId)[]): boolean => {
  return thoughts.length === 1 && !!thoughts[0] && ROOT_CONTEXTS.includes(thoughts[0])
}
