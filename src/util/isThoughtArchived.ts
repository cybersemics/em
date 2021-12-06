import { equalThoughtValue } from '../util'
import { Path, State } from '../@types'
import { childIdsToThoughts } from '../selectors'

/** Determines whether a thought is archived or not. */
export const isThoughtArchived = (state: State, path: Path) => {
  const thoughtsArray = childIdsToThoughts(state, path)
  return !!(thoughtsArray && thoughtsArray.some(equalThoughtValue('=archive')))
}
