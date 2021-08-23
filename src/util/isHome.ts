import { HOME_TOKEN } from '../constants'
import { Child, ThoughtContext } from '../@types'

/** Returns true if the thoughts or path is the home context. */
export const isHome = (thoughts: (string | Child | ThoughtContext)[]): boolean => {
  return thoughts.length === 1 && !!thoughts[0] && thoughts[0] === HOME_TOKEN
}
