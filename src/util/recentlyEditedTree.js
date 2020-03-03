import _ from 'lodash'
import { timestamp } from './timestamp'
import { pathToContext } from './pathToContext'
import { timeDifference } from '../util.js'
import { EM_TOKEN } from '../constants'
import { produce } from 'immer'

const EDIT_TIME_MAX = 1000 // time diff limit in second for replacing descendants by ancestor

const findTreeDeepestSubcontext = (tree, path, index = 0) => {
  const node = tree[path[index]]
  if (node) return findTreeDeepestSubcontext(node, path, index + 1)
  else return { node: index === 0 ? null : tree, path: path.slice(0, index) }
}

export const findTreeDescendants = (tree, startingPath) => {
  const node = _.get(tree, startingPath)
  if (!node) return []
  else if (node.leaf) return [{ ...node }]
  else return Object.keys(node).reduce((acc, child) => [...acc, ...findTreeDescendants(tree, [...startingPath, child])], [])
}

const findClosestAncestorWithMultipleChildren = (tree, context, index = 0, closestAncestor = { node: null, path: [EM_TOKEN] }) => {
  const node = tree[context[index]]
  if (node) return findClosestAncestorWithMultipleChildren(node, context, index + 1, (index !== 0 && !node.leaf && Object.keys(node).length > 1) ? { node, path: context.slice(0, index + 1) } : closestAncestor)
  else return closestAncestor
}

const nodeChange = (tree, oldPath, newPath) => {
  const oldContext = [EM_TOKEN, ...pathToContext(oldPath)]
  const newContext = [EM_TOKEN, ...pathToContext(newPath)]

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
          if (timeDifference(timestamp(), descendant.lastUpdated) > EDIT_TIME_MAX) {
            const descendantContext = [EM_TOKEN, ...pathToContext(descendant.path)]
            const closestAncestor = findClosestAncestorWithMultipleChildren(tree, descendantContext).path
            _.unset(tree, descendantContext.slice(0, closestAncestor.length + 1))
            descendantReplaced = true
          }
          else {
            const updatedDescendantPath = newPath.concat(descendant.path.slice(newPath.length))
            _.unset(tree, [EM_TOKEN, ...pathToContext(descendant.path)])
            _.set(tree, [EM_TOKEN, ...pathToContext(updatedDescendantPath)], { leaf: true, lastUpdated: timestamp(), path: updatedDescendantPath })
          }
        })
        if (descendantReplaced) nodeChange(tree, oldPath, newPath) // called once again to remove merge inconsitencty that might occur while replacing descendants by ancestor
        else if (oldContext.slice(-1)[0] !== newContext.slice(-1)[0]) _.unset(tree, oldContext)
      }
      else {
        let isMerged = false // eslint-disable-line fp/no-let
        leafNodes.forEach(descendant => {
          const descendantContext = [EM_TOKEN, ...pathToContext(descendant.path)]
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

const nodeDelete = (tree, oldPath, timestampUpdate = true) => {
  const oldContext = [EM_TOKEN, ...pathToContext(oldPath)]
  const { node: commonNode, path: commonPath } = findTreeDeepestSubcontext(tree, oldContext)
  if (commonNode) {
    if (oldContext.length > commonPath.length) return
    if (commonPath.length !== 1) _.unset(tree, commonPath) // preventing deleting of _ROOT_
    const parentPath = commonPath.slice(0, commonPath.length - 1)
    const grandParentPath = commonPath.slice(0, commonPath.length - 2)
    const parentNode = _.get(tree, parentPath)
    const grandParentNode = _.get(tree, grandParentPath)
    const nodeToMergeIntoPath = (parentNode && Object.keys(parentNode).length !== 0) ? parentPath : ((grandParentNode && Object.keys(grandParentNode).length - 1 > 0) ? grandParentPath : false)
    if (nodeToMergeIntoPath) {
      // checking all the nodes from the direct parent or grandparent , if available updating all the descendants lastUpdated
      if (commonPath.length - nodeToMergeIntoPath.length === 2) _.unset(tree, parentPath) // if the parent path is merged to grandParent then deleting the parent node
      findTreeDescendants(tree, nodeToMergeIntoPath).forEach(descendant => {
        _.set(tree, [EM_TOKEN, ...pathToContext(descendant.path)], { leaf: true, lastUpdated: timestampUpdate ? timestamp() : descendant.lastUpdated, path: descendant.path })
      })
    }
    // if cannot be merged to either parent or grandParent then just making parent path as the leaf node *** exception if parent path is __ROOT__ node ***
    else if (parentPath.length > 1) _.set(tree, parentPath, { leaf: true, lastUpdated: timestamp(), path: oldPath.slice(0, parentPath.length - 1) })
  }
}

const nodeMove = (tree, oldPath, newPath) => {
  const oldContext = [EM_TOKEN, ...pathToContext(oldPath)]
  const newContext = [EM_TOKEN, ...pathToContext(newPath)]

  const { node: oldNode, path: commonOldPath } = findTreeDeepestSubcontext(tree, oldContext)
  const { path: commonNewPath } = findTreeDeepestSubcontext(tree, newContext)

  if (oldNode && commonOldPath.length === oldContext.length) {
    // if node is already available
    if (commonOldPath.length === commonNewPath.length) {
      // if moved with in same place (only rank has changed) (to prevent traversing descendants)
      nodeChange(tree, oldPath, newPath)
    }
    else {
      if (oldNode.leaf) {
        nodeChange(tree, newPath.slice(0, newPath.length - 1).concat({ value: '' }), newPath)
      }
      else {
        const descendants = findTreeDescendants(tree, oldContext)
        descendants.forEach(descendant => {
          const updatedDescendantPath = newPath.concat(descendant.path.slice(oldPath.length))
          nodeChange(tree, newPath.slice(0, newPath.length - 1).concat({ value: '' }), updatedDescendantPath)
        })
      }
      nodeDelete(tree, oldPath, false)
    }
  }
  else {
    // if exact node is not found in the tree
    nodeChange(tree, newPath.slice(0, newPath.length - 1).concat({ value: '' }), newPath)
  }
}

export const treeChange = (originalTree, oldPath, newPath) => produce(originalTree, draftTree => nodeChange(draftTree, oldPath, newPath))

export const treeDelete = (originalTree, oldPath) => produce(originalTree, draftTree => nodeDelete(draftTree, oldPath))

export const treeMove = (originalTree, oldPath, newPath) => produce(originalTree, draftTree => nodeMove(draftTree, oldPath, newPath))
