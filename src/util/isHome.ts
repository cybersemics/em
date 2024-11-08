import ThoughtId from '../@types/ThoughtId'
import { HOME_TOKEN } from '../constants'

/** Returns true if the Thoughts or Path is the home context. */
const isHome = (thoughts: (string | ThoughtId)[]): boolean => {
  return thoughts.length === 1 && thoughts[0] === HOME_TOKEN
}

export default isHome
