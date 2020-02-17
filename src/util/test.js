import at from 'lodash.at'
import set from 'lodash.set'
import unset from 'lodash.unset'
import { timestamp } from './timestamp'

export const reducePathToIndex = path => path.reduce((acc, val, i) => acc + (i === 0 ? '' : '.') + val, '')

export const findDeepestCommonNode = (tree, path) => {
  const availableNode = at(tree, [reducePathToIndex(path)])[0]
  if (availableNode) return { node: availableNode, path }
  const pathIndex = path.findIndex((value, index) => at(tree, [reducePathToIndex(path.slice(0, path.length - index))])[0])
  return pathIndex > -1 ? { node: at(tree, [reducePathToIndex(path.slice(0, path.length - pathIndex))])[0], path: path.slice(0, path.length - pathIndex) } : {}
}

export const findAllLeafNodes = (tree, startingPath, leafNodes = []) => {
  const node = at(tree, [reducePathToIndex(startingPath)])[0]
  if (!node) return []
  if (node.leaf) return leafNodes.push({ ...node })
  Object.keys(node).forEach(child => findAllLeafNodes(tree, [...startingPath, child], leafNodes))
  return leafNodes
}

export const onNodeChange = (tree, oldPath, newPath) => {
  const { node: commonNode, path: commonPath } = findDeepestCommonNode(tree, oldPath)
  console.log(commonPath)
  if (commonPath.length === 1) {
  }
  else if (commonNode) {
    if (commonNode.leaf) {
      unset(tree, oldPath)
      set(tree, newPath, { leaf: true, path: newPath, lastUpdated: timestamp() })
    }
    else {
      const leafNodes = findAllLeafNodes(tree, commonPath)
      if (commonPath.length === oldPath.length) {
        console.log(findAllLeafNodes(tree, commonPath))
        //descendants
        leafNodes.forEach((descendant) => {
          const updatedDescendantPath = newPath.concat(descendant.path.slice(newPath.length))
          unset(tree, descendant.path)
          set(tree, updatedDescendantPath, { leaf: true, path: updatedDescendantPath, lastUpdated: timestamp() })
        })
        unset(tree, oldPath)
      }
    }
  }
  else {

  }
}
