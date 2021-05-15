import { Path } from '../types'
import { State } from '../util/initialState'

interface Options {
  path?: Path | null,
}

/** Set status of hover expand top. */
const expandHoverTop = (state: State, { path }: Options): State => ({ ...state, expandHoverTopPath: path })

export default expandHoverTop
