import Context from '../@types/Context'
import Path from '../@types/Path'
import State from '../@types/State'
import { ABSOLUTE_PATH, ABSOLUTE_TOKEN, HOME_PATH, HOME_TOKEN } from '../constants'
import parentOf from '../util/parentOf'

const RootPathMap: Record<string, Path> = {
  [HOME_TOKEN]: HOME_PATH,
  [ABSOLUTE_TOKEN]: ABSOLUTE_PATH,
}

/** Checks if an object is of type Path. */
const isPath = (o: Context | Path): o is Path => o.length > 0 && Object.prototype.hasOwnProperty.call(o[0], 'value')

/** Gets the parent Context/Path of a given Context/Path. If passed a child of the root thought, returns [HOME_TOKEN] or [ABSOLUTE_TOKEN] as appropriate. */
const rootedParentOf = <T extends Context | Path>(state: State, thoughts: T): T => {
  const startingRankedRoot = RootPathMap[state.rootContext[0]]

  return thoughts && thoughts.length > 1
    ? (parentOf(thoughts) as T)
    : isPath(thoughts)
      ? (startingRankedRoot as T)
      : (state.rootContext as T)
}

export default rootedParentOf
