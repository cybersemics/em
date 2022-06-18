import { ABSOLUTE_TOKEN } from '../constants'
import ThoughtId from '../@types/ThoughtId'
import ThoughtContext from '../@types/ThoughtContext'

/** Returns true if the thoughts or path is the absolute context. */
const isAbsolute = (thoughts: (string | ThoughtId | ThoughtContext)[]): boolean => {
  return thoughts.length === 1 && !!thoughts[0] && thoughts[0] === ABSOLUTE_TOKEN
}

export default isAbsolute
