import Path from '../@types/Path'
import State from '../@types/State'
import findDescendant from '../selectors/findDescendant'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import equalPath from '../util/equalPath'
import head from '../util/head'

/** Returns true when the given paths are siblings that Organize Thoughts can restructure. */
const canOrganizeThought = (state: State, paths: Path[]): boolean => {
  if (paths.length === 0) return false
  const simplePaths = paths.map(path => simplifyPath(state, path))
  const firstParent = rootedParentOf(state, simplePaths[0])
  return (
    !isContextViewActive(state, firstParent) &&
    simplePaths.every(path => !isContextViewActive(state, path)) &&
    simplePaths.every(path => equalPath(rootedParentOf(state, path), firstParent)) &&
    !findDescendant(state, head(firstParent), '=readonly') &&
    !findDescendant(state, head(firstParent), '=unextendable') &&
    simplePaths.every(path => {
      const thought = getThoughtById(state, head(path))
      return !!thought && !thought.generating
    })
  )
}

export default canOrganizeThought
