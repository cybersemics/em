import _ from 'lodash'
import { timestamp } from './timestamp'
import { pathToContext } from './pathToContext'
import { timeDifference } from '../util.js'

const editTimeMax = 30 // time diff limit in second for replacing descendants by ancestor

const findTreeDeepestSubcontext = (tree, path) => {
  if (path.length === 0) return { node: {}, path: [] }
  const availableNode = _.get(tree, path)
  if (availableNode) return { node: availableNode, path }
  const pathIndex = path.findIndex((value, index) => _.get(tree, (path.slice(0, path.length - index))))
  return pathIndex > -1 ? { node: _.get(tree, path.slice(0, path.length - pathIndex)), path: path.slice(0, path.length - pathIndex) } : {}
}

export const findTreeDescendants = (tree, startingPath, leafNodes = []) => {
  const node = _.get(tree, startingPath)
  if (!node) return []
  if (node.leaf) leafNodes.push({ ...node }) // eslint-disable-line fp/no-mutating-methods
  else Object.keys(node).forEach(child => findTreeDescendants(tree, [...startingPath, child], leafNodes))
  return leafNodes
}

const findClosestAncestorWithMultipleChildren = (tree, context) => {
  const contextIndex = context.findIndex((value, index) => {
    const node = _.get(tree, (context.slice(0, context.length - index)))
    return !node.leaf && Object.keys(node).length > 1
  })
  return contextIndex > -1 ? { node: _.get(tree, context.slice(0, context.length - contextIndex + 1)), path: context.slice(0, context.length - contextIndex + 1) } : {}
}

export const onNodeChange = (tree, oldPath, newPath) => {
  const oldContext = ['_ROOT_', ...pathToContext(oldPath)]
  const newContext = ['_ROOT_', ...pathToContext(newPath)]

  const { node: commonNode, path: commonPath } = findTreeDeepestSubcontext(tree, oldContext)
  if (commonNode) {
    if (commonNode.leaf) {
      // A is changed to AF --> AF , A and A.B --> A.B , A.B and A.B.C --> A.B.C
      _.unset(tree, commonPath)
      _.set(tree, newContext, { leaf: true, lastUpdated: timestamp(), path: newPath })
    }
    else {
      const leafNodes = findTreeDescendants(tree, commonPath)
      // if oldPath is already available we just need to update its descendants
      if (commonPath.length === oldContext.length) {
        // this flag is needed to know if ancestor replaces very old descentdant in the tree
        let descendantReplaced = false // eslint-disable-line fp/no-let
        // If A.E which already available in tree is updated to A.EM the updating just its descendants like A.E.O.M to A.EM.O.M.
        leafNodes.forEach(descendant => {
          if (timeDifference(timestamp(), descendant.lastUpdated) > editTimeMax) {
            _.unset(tree, findClosestAncestorWithMultipleChildren(tree, ['_ROOT_', ...pathToContext(descendant.path)]).path)
            descendantReplaced = true
          }
          else {
            const updatedDescendantPath = newPath.concat(descendant.path.slice(newPath.length))
            _.unset(tree, ['_ROOT_', ...pathToContext(descendant.path)])
            _.set(tree, ['_ROOT_', ...pathToContext(updatedDescendantPath)], { leaf: true, lastUpdated: timestamp(), path: updatedDescendantPath })
          }
        })
        if (descendantReplaced) onNodeChange(tree, oldPath, newPath) // called once again to remove merge inconsitencty that might occur while replacing descendants by ancestor
        else _.unset(tree, oldContext)
      }
      else {
        let isMerged = false // eslint-disable-line fp/no-let
        leafNodes.forEach(descendant => {
          const descendantContext = ['_ROOT_', ...pathToContext(descendant.path)]
          if (descendantContext[1] === '__EM__') return // preventing thoughts at level 1 from merged to this (temporary fix)
          const longContext = descendantContext.length > newContext.length ? descendantContext : newContext
          const shortContext = newContext.length < descendantContext.length ? newContext : descendantContext
          // siblings A.B.C and A.B.D ---> A.B.D
          if (descendantContext.length === newContext.length && newContext.length - commonPath.length === 1) {
            isMerged = true
            _.unset(tree, descendantContext)
            _.set(tree, newContext, { leaf: true, lastUpdated: timestamp(), path: newPath })
          }
          /*
            restricting merge of direct cousins like A.B.C.F and A.B.D.E
            merging distant relation A.B.C and A.B.D.E.F.G.H ---> A.B.D.E.F.G.H
          */
          else if (!(shortContext.length - commonPath.length > 1 || (newContext.length === descendantContext.length && newContext.length - commonPath.length === 2))) {
            isMerged = true
            _.unset(tree, shortContext.slice(0, commonPath.length + 1))
            _.set(tree, longContext, { leaf: true, lastUpdated: timestamp(), path: newContext.length > descendantContext.length ? newPath : descendant.path })
          }
        })
        // adding new thought to the tree
        if (!isMerged) _.set(tree, newContext, { leaf: true, lastUpdated: timestamp(), path: newPath })
      }
    }
  }
}

export const onNodeDelete = (tree, oldPath) => {
  const oldContext = ['_ROOT_', ...pathToContext(oldPath)]
  const { node: commonNode, path: commonPath } = findTreeDeepestSubcontext(tree, oldContext)
  if (commonNode) {
    if (oldContext.length > commonPath.length) return
    if (commonPath.length !== 1) _.unset(tree, commonPath) // preventing deleting of _ROOT_
    const parentPath = commonPath.slice(0, commonPath.length - 1)
    const grandParentPath = commonPath.slice(0, commonPath.length - 2)
    const parentNode = _.get(tree, parentPath)
    const grandParentNode = _.get(tree, grandParentPath)
    const nodeToMergeIntoPath = (parentNode && Object.keys(parentNode).length !== 0) ? parentPath : ((grandParentNode && Object.keys(grandParentNode).length - 1 !== 0) ? grandParentPath : false)
    if (nodeToMergeIntoPath) {
      // checking all the nodes from the direct parent or grandparent , if available updating all the descendants lastUpdated
      if (commonPath.length - nodeToMergeIntoPath.length === 2) _.unset(tree, parentPath) // if the parent path is merged to grandParent then deleting the parent node
      findTreeDescendants(tree, nodeToMergeIntoPath).forEach(descendant => {
        _.set(tree, ['_ROOT_', ...pathToContext(descendant.path)], { leaf: true, lastUpdated: timestamp(), path: descendant.path })
      })
    }
    // if cannot be merged to either parent or grandParent then just making parent path as the leaf node *** exception if parent path is __ROOT__ node ***
    else if (parentPath.length > 1) _.set(tree, parentPath, { leaf: true, lastUpdated: timestamp(), path: oldPath.slice(0, parentPath.length - 1) })
  }
}
