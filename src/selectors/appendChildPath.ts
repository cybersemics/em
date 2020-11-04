import { SimplePath, Path } from '../types'
import { parentOf, head, pathToContext, unroot } from '../util'
import { State } from '../util/initialState'
import isContextViewActive from './isContextViewActive'

/** Appends the head of a child SimplePath to a parent Path. In case of parent with active context view it appends head of the parent of the childPath.
 *
 * @example
 * // Note: Examples use Contexts only for clarity; the function actually takes Paths.
 *
 * // returns ['a', 'b', 'c', 'd']
 * appendChildPath(state, ['a', 'b', 'c', 'd'], ['a', 'b' , 'c'])
 *
 * // returns ['m', 'n', 'o', 'p', 'q']
 * appendChildPath(state, ['a', 'b', 'p', 'o', 'q'], ['m', 'n', 'o', 'p'])
 *
 * // Note: ['i', 'j', 'k'] has active context view
 * // returns [i', 'j', 'k', 't']
 * appendChildPath(state, ['r', 's', 't', 'k'], ['i', 'j', 'k'])
 * */
const appendChildPath = (state: State, childPath: SimplePath, parentThoughtsResolved?: Path): Path => {
  if (!parentThoughtsResolved) return childPath as Path

  const isParentContextViewActive = isContextViewActive(state, pathToContext(parentThoughtsResolved))
  return unroot([
    ...parentThoughtsResolved,
    head(isParentContextViewActive ? parentOf(childPath) : childPath)
  ])
}

export default appendChildPath
