import { ABSOLUTE_TOKEN } from '../constants'
import { ThoughtId, ThoughtContext } from '../@types'

/** Returns true if the thoughts or path is the absolute context. */
export const isAbsolute = (thoughts: (string | ThoughtId | ThoughtContext)[]): boolean => {
  return thoughts.length === 1 && !!thoughts[0] && thoughts[0] === ABSOLUTE_TOKEN
}
