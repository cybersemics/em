import Path from '../@types/Path'
import State from '../@types/State'

/** Set status of hover expand top. */
const expandHoverUp = (state: State, { path }: { path?: Path | null }): State => ({
  ...state,
  expandHoverUpPath: path,
})

export default expandHoverUp
