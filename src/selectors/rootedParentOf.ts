import { ABSOLUTE_PATH, ABSOLUTE_TOKEN, HOME_PATH, HOME_TOKEN } from '../constants'
import { parentOf } from '../util'
import { Context, Path } from '../types'
import { State } from '../util/initialState'

const RootPathMap: Record<string, Path> = {
  [HOME_TOKEN]: HOME_PATH,
  [ABSOLUTE_TOKEN]: ABSOLUTE_PATH
}

/** Checks if an object is of type Path. */
const isPath = (o: Context | Path): o is Path =>
  o.length > 0 && Object.prototype.hasOwnProperty.call(o[0], 'value')

/** Get the parentOf thoughts or the root ranked path  if there are none. */
const rootedParentOf = <T extends Context | Path>(state: State, thoughts: T): T => {

  const startingRankedRoot = RootPathMap[state.rootContext[0]]

  return thoughts && thoughts.length > 1
    ? parentOf(thoughts) as T
    : isPath(thoughts)
      ? startingRankedRoot as T
      : state.rootContext as T
}

export default rootedParentOf
