import Path from '../@types/Path'
import State from '../@types/State'
import head from '../util/head'
import isRoot from '../util/isRoot'
import attributeEquals from './attributeEquals'
import rootedParentOf from './rootedParentOf'

/** Returns true if the thought at the given path is in the second column of a table view, i.e. its grandparent has =view/Table. */
const isTableCol2 = (state: State, path: Path): boolean => {
  const parentPath = rootedParentOf(state, path)
  if (isRoot(parentPath)) return false
  const grandparentPath = rootedParentOf(state, parentPath)
  return attributeEquals(state, head(grandparentPath), '=view', 'Table')
}

export default isTableCol2
