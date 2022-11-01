import Path from '../@types/Path'
import State from '../@types/State'
import store from '../stores/app'
import pathToContext from '../util/pathToContext'

// overloaded function signatures
function prettyPath(state: State, path: Path | null | undefined): string
function prettyPath(path: Path | null | undefined): string

/** Convert a Path to a readable string for debugging. */
function prettyPath(state: State | Path | null | undefined, path?: Path | null | undefined) {
  const _path = typeof (state as Path)[0] === 'string' && path === undefined ? (state as Path) : path
  const _state = typeof (state as Path)[0] === 'string' && path === undefined ? store.getState() : (state as State)
  return _path && pathToContext(_state, _path).join('/')
}

export default prettyPath
