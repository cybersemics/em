import ThoughtContext from '../@types/ThoughtContext'
import ThoughtId from '../@types/ThoughtId'
import { ABSOLUTE_TOKEN } from '../constants'

/** Returns true if the thoughts or path is the absolute context. */
const isAbsolute = (thoughts: (string | ThoughtId | ThoughtContext)[]): boolean => {
  return thoughts.length === 1 && !!thoughts[0] && thoughts[0] === ABSOLUTE_TOKEN
}

export default isAbsolute
