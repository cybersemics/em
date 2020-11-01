import { SimplePath, Path } from '../types'
import { parentOf, head, pathToContext, unroot } from '../util'
import { State } from '../util/initialState'
import isContextViewActive from './isContextViewActive'

/** Get thoughtsResolved for a child from it's parent thoughtsResolved.
 *
 * @example
 * // returns ['a', 'b', 'c', 'd']
 * getChildResolved(state, ['a', 'b' , 'c'], ['a', 'b', 'c', 'd'])
 *
 * // returns ['m', 'n', 'o', 'p', 'q']
 * getChildResolved(state, ['m', 'n', 'o', 'p'], ['a', 'b', 'p', 'o', 'q'])
 *
 * // Note: ['i', 'j', 'k'] has active context view
 * // returns [i', 'j', 'k', 't']
 * getChildResolved(state, ['i', 'j', 'k'], ['r', 's', 't', 'k'])
 * */
const getChildResolvedPath = (state: State, parentThoughtsResolved: Path, childPath: SimplePath): Path => {
  const isParentContextViewActive = isContextViewActive(state, pathToContext(parentThoughtsResolved))
  return unroot(parentThoughtsResolved.concat(isParentContextViewActive ? head(parentOf(childPath)) : head(childPath)))
}

export default getChildResolvedPath
