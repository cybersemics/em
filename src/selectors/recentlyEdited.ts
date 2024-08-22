import Path from '../@types/Path'
import State from '../@types/State'
import isDescendantPath from '../util/isDescendantPath'
import pathToThought from './pathToThought'

/** Gets the list of recently edited thoughts from the jump history. Filters out thoughts that no longer exist and adjacent ancestors. */
const recentlyEdited = (state: State) => {
  const filtered: Path[] = []

  for (let i = 0; i < state.jumpHistory.length; i++) {
    const path = state.jumpHistory[i]
    if (path && pathToThought(state, path) && !isDescendantPath(filtered.at(-1) || null, path)) {
      filtered.push(path)
    }
  }

  return filtered
}

export default recentlyEdited
