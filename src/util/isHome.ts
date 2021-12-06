import { HOME_TOKEN } from '../constants'
import { ThoughtId } from '../@types'

/** Returns true if the thoughts or path is the home context. */
export const isHome = (thoughts: (string | ThoughtId)[]): boolean => {
  return thoughts.length === 1 && !!thoughts[0] && thoughts[0] === HOME_TOKEN
}
