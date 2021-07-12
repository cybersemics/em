import { Path, State } from '../types'

interface Options {
  path?: Path | null
}

/** Set status of hover expand top. */
const expandHoverTop = (state: State, { path }: Options): State => ({ ...state, expandHoverTopPath: path })

export default expandHoverTop
