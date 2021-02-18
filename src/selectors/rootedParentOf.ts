import { ROOT_PATH_MAP } from '../constants'
import { parentOf } from '../util'
import { Context, Path } from '../types'
import { State } from '../util/initialState'

/** Checks if an object is of type Path. */
const isPath = (o: Context | Path): o is Path =>
  o.length > 0 && Object.prototype.hasOwnProperty.call(o[0], 'value')

/** Get the parentOf thoughts or the root ranked path  if there are none. */
const rootedParentOf = <T extends Context | Path>(state: State, thoughts: T): T => {

  const rootToken = state.rootContext[0]

  const startingRankedRoot = ROOT_PATH_MAP[rootToken]

  return thoughts && thoughts.length > 1
    ? parentOf(thoughts) as T
    : isPath(thoughts)
      ? startingRankedRoot as T
      : [rootToken] as T
}

export default rootedParentOf
