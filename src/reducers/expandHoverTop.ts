import Path from '../@types/Path'
import State from '../@types/State'

/** Set status of hover expand top. */
const expandHoverTop = (state: State, { path }: { path?: Path | null }): State => ({
  ...state,
  expandHoverTopPath: path,
})

export default expandHoverTop
