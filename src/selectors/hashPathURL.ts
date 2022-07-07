import Path from '../@types/Path'
import State from '../@types/State'
import isContextViewActive from '../selectors/isContextViewActive'
import isRoot from '../util/isRoot'

/** Encodes context array into a URL. */
const hashPathURL = (state: State, path: Path) => {
  if (!path || isRoot(path)) return '/'

  const userId = window.location.pathname.split('/')[1] || '~'
  const queryString = window.location.search
  const thoughtsEncoded = path
    // Note: Since thouhtId is a uuid, so they are url safe
    .map((thoughtId, i) => thoughtId + (isContextViewActive(state, path.slice(0, i + 1) as Path) ? '~' : ''))
    .join('/')

  return `/${userId}/${thoughtsEncoded}${queryString}`
}

export default hashPathURL
