import Path from '../@types/Path'
import State from '../@types/State'

interface Options {
  path?: Path | null
}

/** Set status of hover expand top. */
const expandHoverTop = (state: State, { path }: Options): State => ({ ...state, expandHoverTopPath: path })

export default expandHoverTop
