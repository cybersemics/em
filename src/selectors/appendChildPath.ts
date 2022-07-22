import _ from 'lodash'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import head from '../util/head'
import { resolveArray, resolvePath } from '../util/memoizeResolvers'
import parentOf from '../util/parentOf'
import unroot from '../util/unroot'
import isContextViewActive from './isContextViewActive'

/** A memoize resolver that handles child and simplePath value equality for getChildPath. */
const resolve = (state: State, childPath: SimplePath, parentThoughtsResolved?: Path) =>
  resolveArray([
    // slow, but ensures appendChildPath doesn't get memoized when context view changes
    parentThoughtsResolved ? isContextViewActive(state, parentThoughtsResolved) : '',
    resolvePath(childPath),
    resolvePath(parentThoughtsResolved || ([] as unknown as SimplePath)),
  ])

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
const appendChildPath = _.memoize((state: State, childPath: SimplePath, parentThoughtsResolved?: Path): Path => {
  if (!parentThoughtsResolved) return childPath as Path

  const isParentContextViewActive = isContextViewActive(state, parentThoughtsResolved)
  return unroot([
    ...parentThoughtsResolved,
    // childPath === 1 when a context thought is in the root
    head(isParentContextViewActive && childPath.length > 1 ? parentOf(childPath) : childPath),
  ])
}, resolve)

export default appendChildPath
