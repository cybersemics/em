import ThoughtId from '../@types/ThoughtId'
import { ROOT_CONTEXTS } from '../constants'

/** Returns true if the Thoughts or Path is the one of the root contexts (HOME or ABSOLUTE). */
const isRoot = (thoughts: (string | ThoughtId)[]): boolean => {
  return thoughts.length === 1 && !!thoughts[0] && (ROOT_CONTEXTS as string[]).includes(thoughts[0])
}

export default isRoot
