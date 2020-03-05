import _ from 'lodash'
import { timestamp } from './timestamp'
import { pathToContext } from './pathToContext'
import { timeDifference, contextOf } from '../util.js'
import { produce } from 'immer'

const EDIT_TIME_MAX = 7200 // time diff limit in second for replacing descendants by ancestor

/**
   * finds tree deepeset common subcontext for given a given path
   * @param {Object} tree nested object representing tree
   * @param {string[]} context array of string representing path
   * @returns {string[]} common subcontext
   */
const findTreeDeepestSubcontext = (tree, context, index = 0) => {
  if (context.length === 0 && index === 0) return tree
  const node = tree[context[index]]
  if (node) return findTreeDeepestSubcontext(node, context, index + 1)
  else return { node: tree, path: context.slice(0, index) }
}

/**
   * finds all the desecendant for a given context of a specific node
   * @param {Object} parentNode nested object representing tree
   * @param {string[]} startingPath context of the node whose descendants needs to be returned
   * @returns {Object[]} array of descendant object
   */
export const findTreeDescendants = (parentNode, startingPath, child) => {
  const node = child !== undefined ? parentNode[child] : (startingPath.length === 0 ? parentNode : _.get(parentNode, startingPath)) // _.get only gets called once for accesing starting path
  if (!node) return []
  else if (node.leaf) return [{ ...node }]
  else return Object.keys(node).reduce((acc, child) => [...acc, ...findTreeDescendants(node, startingPath, child)], [])
}

/**
   * finds closest ancestor that has multiple children nodes
   * @param {object} tree nested object representing tree
   * @param {string[]} context array of string representing path
   * @returns {Object} closest ancestor node with multiple children
   */
const findClosestAncestorWithMultipleChildren = (tree, context, index = 0, closestAncestor = { node: null, path: [] }) => {
  const node = tree[context[index]]
  if (node) return findClosestAncestorWithMultipleChildren(node, context, index + 1, (index !== 0 && !node.leaf && Object.keys(node).length > 1) ? { node, path: context.slice(0, index + 1) } : closestAncestor)
  else return closestAncestor
}

/**
   * Adds or updates node to the existing tree object by mutating.
   * @param {object} tree nested object representing tree
   * @param {string[]} oldPath array of string representing path
   * @param {string[]} newPath array of string representing path
   */
const nodeChange = (tree, oldPath, newPath) => {
  const oldContext = pathToContext(oldPath)
  const newContext = pathToContext(newPath)

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
            const descendantContext = pathToContext(descendant.path)
            const closestAncestor = findClosestAncestorWithMultipleChildren(tree, descendantContext).path
            _.unset(tree, descendantContext.slice(0, closestAncestor.length + 1))
            descendantReplaced = true
          }
          else {
            const updatedDescendantPath = newPath.concat(descendant.path.slice(newPath.length))
            _.unset(tree, pathToContext(descendant.path))
            _.set(tree, pathToContext(updatedDescendantPath), { leaf: true, lastUpdated: timestamp(), path: updatedDescendantPath })
          }
        })
        if (descendantReplaced) nodeChange(tree, oldPath, newPath) // called once again to remove merge inconsitencty that might occur while replacing descendants by ancestor
        else if (oldContext.slice(-1)[0] !== newContext.slice(-1)[0]) _.unset(tree, oldContext)
      }
      else {
        let isMerged = false // eslint-disable-line fp/no-let
        leafNodes.forEach(descendant => {
          const descendantContext = pathToContext(descendant.path)
          if (descendantContext[0] === '__EM__') return // preventing nodes at level 0 from merged to this (temporary fix)
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

/**
   * Deletes node from existing tree object using mutation.
   * @param {object} tree nested object representing tree
   * @param {string[]} oldPath array of string representing path
   * @param {string[]} newPath array of string representing path
   * @param {boolean} [timestampUpdate=true] if false it doesn't update lastUpdated property of all affected leaf nodes (used by nodeMove)
   */
const nodeDelete = (tree, oldPath, timestampUpdate = true) => {
  const oldContext = pathToContext(oldPath)
  const { node: commonNode, path: commonPath } = findTreeDeepestSubcontext(tree, oldContext)
  if (commonNode) {
    if (oldContext.length > commonPath.length) return
    _.unset(tree, commonPath)
    const parentPath = contextOf(commonPath) || []
    const grandParentPath = contextOf(contextOf(commonPath)) || []
    const parentNode = _.get(tree, parentPath) || tree
    const grandParentNode = _.get(tree, grandParentPath) || tree
    const nodeToMergeIntoPath = (parentNode && Object.keys(parentNode).length !== 0) ? parentPath : ((grandParentNode && Object.keys(grandParentNode).length - 1 > 0) ? grandParentPath : false)
    if (nodeToMergeIntoPath) {
      // checking all the nodes from the direct parent or grandparent , if available updating all the descendants lastUpdated
      if (commonPath.length - nodeToMergeIntoPath.length === 2) _.unset(tree, parentPath) // if the parent path is merged to grandParent then deleting the parent node
      findTreeDescendants(tree, nodeToMergeIntoPath).forEach(descendant => {
        _.set(tree, pathToContext(descendant.path), { leaf: true, lastUpdated: timestampUpdate ? timestamp() : descendant.lastUpdated, path: descendant.path })
      })
    }
    // if cannot be merged to either parent or grandParent then just making parent path as the leaf node *** exception if parent path is __ROOT__ node ***
    else _.set(tree, parentPath, { leaf: true, lastUpdated: timestamp(), path: oldPath.slice(0, parentPath.length) })
  }
}

/**
   * Moves a node between branches in the existing tree object using mutation.
   * @param {object} tree nested object representing tree
   * @param {string[]} oldPath array of string representing path
   * @param {string[]} newPath array of string representing path
   */
const nodeMove = (tree, oldPath, newPath) => {
  const oldContext = pathToContext(oldPath)
  const newContext = pathToContext(newPath)

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
        nodeChange(tree, contextOf(newPath).concat({ value: '' }), newPath)
      }
      else {
        const descendants = findTreeDescendants(tree, oldContext)
        descendants.forEach(descendant => {
          const updatedDescendantPath = newPath.concat(descendant.path.slice(oldPath.length))
          nodeChange(tree, contextOf(newPath).concat({ value: '' }), updatedDescendantPath)
        })
      }
      nodeDelete(tree, oldPath, false)
    }
  }
  else {
    // if exact node is not found in the tree
    nodeChange(tree, contextOf(newPath).concat({ value: '' }), newPath)
  }
}

/** using immer to pass a draft object as the first argument to the given destructive function to avoid mutation **/
const immerfy = f => (obj, ...rest) => produce(obj, draft => f(draft, ...rest))

/**
   * Adds or updates node to the existing tree object.
   *
   * **Notes**
   * 1. length of oldPath must be either equal to or less than length of newPath.
   * 2. difference between length of oldPath and length of commonPath ( subcontext shared between oldPath and newPath ) cannot be more than 1.
   * @param {object} tree nested object representing tree
   * @param {string[]} oldPath array of string representing path
   * @param {string[]} newPath array of string representing path
   * @returns {Object} immutable updated tree after change
   */
export const treeChange = immerfy(nodeChange)

/**
   * Deletes node from existing tree object.
   * @param {object} tree nested object representing tree
   * @param {string[]} oldPath array of string representing path
   * @param {string[]} newPath array of string representing path
   * @returns {Object} immutable updated tree after node delete
   */
export const treeDelete = immerfy(nodeDelete)

/**
   * Moves a node between branches in the existing tree object.
   * @param {object} tree nested object representing tree
   * @param {string[]} oldPath array of string representing path
   * @param {string[]} newPath array of string representing path
   * @returns {Object} immutable updated tree after node move
   */
export const treeMove = immerfy(nodeMove)
