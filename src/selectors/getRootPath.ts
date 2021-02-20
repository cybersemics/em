import { ABSOLUTE_PATH, ABSOLUTE_TOKEN, HOME_PATH, HOME_TOKEN } from '../constants'
import { SimplePath } from '../types'
import { State } from '../util/initialState'

const RootPathMap: Record<string, SimplePath> = {
  [HOME_TOKEN]: HOME_PATH,
  [ABSOLUTE_TOKEN]: ABSOLUTE_PATH
}

/**
 * Get ranked or absolute ranked root based on rootContext.
 */
const getRootPath = (state: State) => {
  const startingToken = state.rootContext[0]
  return RootPathMap[startingToken]
}

export default getRootPath
