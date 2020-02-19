import at from 'lodash.at'
import set from 'lodash.set'
import unset from 'lodash.unset'
import { timestamp } from './timestamp'

export const reducePathToIndex = path => path.reduce((acc, val, i) => acc + (i === 0 ? '' : '.') + val, '')

export const findTreeDeepestSubcontext = (tree, path) => {
  if (path.length === 0) return { node: {}, path: [] }
  const availableNode = at(tree, [reducePathToIndex(path)])[0]
  if (availableNode) return { node: availableNode, path }
  const pathIndex = path.findIndex((value, index) => at(tree, [reducePathToIndex(path.slice(0, path.length - index))])[0])
  return pathIndex > -1 ? { node: at(tree, [reducePathToIndex(path.slice(0, path.length - pathIndex))])[0], path: path.slice(0, path.length - pathIndex) } : {}
}

export const findTreeDescendants = (tree, startingPath, leafNodes = []) => {
  const node = at(tree, [reducePathToIndex(startingPath)])[0]
  if (!node) return []
  if (node.leaf) leafNodes.push({ ...node, path: startingPath })
  else {
    Object.keys(node).forEach(child => findTreeDescendants(tree, [...startingPath, child], leafNodes))
  }
  return leafNodes
}

export const onNodeChange = (tree, oldPath, newPath) => {
  const { node: commonNode, path: commonPath } = findTreeDeepestSubcontext(tree, oldPath)
  if (commonNode) {
    if (commonNode.leaf) {
      //A is changed to AF --> AF
      //A and A.B --> A.B 
      //A.B and A.B.C --> A.B.C
      console.log('already available leaf node updated')
      unset(tree, commonPath)
      set(tree, newPath, { leaf: true, lastUpdated: timestamp() })
    }
    else {
      const leafNodes = findTreeDescendants(tree, commonPath)
      //if oldPath is already available we just need to update its descendants
      if (commonPath.length === oldPath.length) {
        console.log('descendants!')
        // If A.E which already available in tree is updated to A.EM the updating just its descendants like A.E.O.M to A.EM.O.M.
        leafNodes.forEach(descendant => {
          const updatedDescendantPath = newPath.concat(descendant.path.slice(newPath.length))
          unset(tree, descendant.path)
          set(tree, updatedDescendantPath, { leaf: true, lastUpdated: timestamp() })
        })
        unset(tree, oldPath)
      }
      else {
        let isMerged = false
        console.log(oldPath, newPath, commonPath, 'hello')
        leafNodes.forEach(descendant => {
          console.log(descendant.path, newPath)
          // siblings A.B.C and A.B.D ---> A.B.D
          if (descendant.path.length === newPath.length && newPath.length - commonPath.length === 1) {
            console.log('sibling', descendant.path)
            isMerged = true
            unset(tree, descendant.path)
            set(tree, newPath, { leaf: true, lastUpdated: timestamp() })
          }
          // not merging direct cousins
          // merging distant relation A.B.C and A.B.D.E.F.G.H ---> A.B.D.E.F.G.H
          else if (!(descendant.path.length === newPath.length && newPath.length - commonPath.length === 2)) {
            console.log('distant relation', descendant.path)
            isMerged = true
            unset(tree, descendant.path)
            set(tree, newPath.length > descendant.path.length ? newPath : descendant.path, { leaf: true, lastUpdated: timestamp() })
          }
        })
        if (!isMerged) {
          console.log('new thought added to tree')
          set(tree, newPath, { leaf: true, lastUpdated: timestamp() })
        }
      }
    }
  }
  else {
  }
}

export const onNodeDelete = ((tree, oldPath) => {
  const { node: commonNode, path: commonPath } = findTreeDeepestSubcontext(tree, oldPath)
  if (commonNode) {
    unset(tree, commonPath)
    const parentNode = at(tree, [commonPath.slice(0, commonPath.length - 1)])[0]
    if (parentNode && Object.keys(parentNode).length !== 0) console.log(parentNode, 'parentNode')
  }
})
