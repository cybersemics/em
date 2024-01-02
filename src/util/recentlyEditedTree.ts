import { produce } from 'immer'
import _ from 'lodash'
import Context from '../@types/Context'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import Timestamp from '../@types/Timestamp'
import { EM_TOKEN } from '../constants'
import appendToPath from '../util/appendToPath'
import equalArrays from '../util/equalArrays'
import hashThought from '../util/hashThought'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'
import timestamp from '../util/timestamp'
import isEM from './isEM'

// @MIGRATION_TODO: Fix recently edited logic.
export interface Leaf {
  leaf: true
  lastUpdated: Timestamp
  path: Path
}

export type Tree = {
  [index: string]: Tree | Leaf
}

/** Returns the difference in seconds between two timestamps. */
const timeDifference = (timestamp1: Timestamp, timestamp2: Timestamp) => Math.floor(timestamp1 - timestamp2) / 1000

/** Encodes array of string to escape unsafe characters (.$[]#/). */
const contextEncode = (context: Context) => context.map(value => hashThought(value))

const EDIT_TIME_MAX = 7200 // time diff limit in second for replacing descendants by ancestor

/**
 * Finds tree deepeset common subcontext for given a given path.
 *
 * @param tree Nested object representing tree.
 * @param context Array of string representing path (encoded).
 * @returns Common Subcontext.
 */
const findTreeDeepestSubcontext = (tree: Tree, context: Context, index = 0): { node: Tree; path: Context } => {
  if (context.length === 0 && index === 0) return { node: tree, path: [] }
  const node = (tree as Index<Tree>)[context[index]]
  return node ? findTreeDeepestSubcontext(node, context, index + 1) : { node: tree, path: context.slice(0, index) }
}

/** Check if the context has root, em or meta programming thoughts. */
const shouldHide = (context: Context) => isRoot(context) || isEM(context) || context.find(isAttribute)

/**
 * Finds all the desecendant for a given context of a specific node.
 *
 * @param tree Nested object representing tree.
 * @param startingPath Context of the node whose descendants needs to be returned (encoded).
 * @returns Array of descendant object.
 */
export const findTreeDescendants = (
  state: State,
  tree: Tree,
  { startingPath, showHiddenThoughts }: { startingPath?: Context; showHiddenThoughts?: boolean },
): Leaf[] => {
  const node = startingPath && startingPath.length > 0 ? _.get(tree, startingPath) : tree
  return !node
    ? []
    : // check node.path here instead of node.leaf to not break on legacy tree structure
      node.path
      ? [].concat(!showHiddenThoughts && shouldHide(pathToContext(state, node.path)) ? [] : { ...node })
      : _.flatMap(Object.keys(node).map(child => findTreeDescendants(state, node[child], { showHiddenThoughts })))
}

/**
 * Finds closest ancestor that has multiple children nodes.
 *
 * @param tree Nested object representing tree.
 * @param context Array of string representing path (encoded).
 * @param [minChildren=2] Mininum no of children.
 * @returns Closest ancestor node with multiple children.
 */
const findClosestSharedAncestor = (
  tree: Tree,
  context: Context,
  minChildren = 2,
  index = 0,
  closestAncestor: { node: Tree | null; path: Context } = { node: null, path: [] },
): { node: Tree | null; path: Context } => {
  const node = (tree as Index<Tree>)[context[index]]
  return node
    ? findClosestSharedAncestor(
        node,
        context,
        minChildren,
        index + 1,
        !node.leaf && Object.keys(node).length >= minChildren
          ? { node, path: context.slice(0, index + 1) }
          : closestAncestor,
      )
    : closestAncestor
}

/**
 * Manually adding node to the existing tree object by mutating. Uses special case of nodeChange.
 *
 * @param tree Nested object representing tree.
 * @param newPath Array of thoughts.
 * @example
 *
 * A.B.C.D.E.F
 * A.B.C.G.H.I
 *
 * If we want to add A.B.C.K.L ,we pass ['A','B','C','K','L'] will as newPath to nodeAdd
 *
 * Note: You should be sure that node A.B.C.K.L is not already available in the tree
 *
 * nodeAdd will just pass ['A','B','C','K','L']  as both second (oldPath) and third parameter (newPath) for nodeChange because
 * commonPath derived from oldPath inside nodeChange will be ['A','B','C'] anyways. (This will eliminate use of DUMMY_TOKEN too)
 */
const nodeAdd = (state: State, tree: Tree, newPath: Path) => nodeChange(state, tree, newPath, newPath)

/**
 * Adds or updates node to the existing tree object by mutating.
 *
 * @param tree Nested object representing tree.
 */
const nodeChange = (state: State, tree: Tree, oldPath: Path, newPath: Path) => {
  const oldContext = contextEncode(pathToContext(state, oldPath))
  const newContext = contextEncode(pathToContext(state, newPath))
  const { node: commonNode, path: commonPath } = findTreeDeepestSubcontext(tree, oldContext)

  if (commonNode) {
    if (commonNode.leaf) {
      // A is changed to AF --> AF , A and A.B --> A.B , A.B and A.B.C --> A.B.C
      _.unset(tree, commonPath)
      _.set(tree, newContext, { leaf: true, lastUpdated: timestamp(), path: newPath })
    } else {
      const leafNodes = findTreeDescendants(state, tree, { startingPath: commonPath, showHiddenThoughts: true })
      // if oldPath is already available we just need to update its descendants
      if (equalArrays(commonPath, oldContext)) {
        // this flag is needed to know if ancestor replaces very old descentdant in the tree
        let descendantReplaced = false
        /*
          Recently Edited List

          A.B.C.D.E.F
          A.Q.K.R
          A.B.G.H.I

          if A.B is changes to A.BE then directly updating all its desendants

          A.BE.C.D.E.F
          A.BE.G.H.I
          A.Q.K.R
         */
        leafNodes.forEach(descendant => {
          if (timeDifference(timestamp(), descendant.lastUpdated) > EDIT_TIME_MAX) {
            const descendantContext = contextEncode(pathToContext(state, descendant.path))
            const closestAncestor = findClosestSharedAncestor(tree, descendantContext).path
            _.unset(tree, descendantContext.slice(0, closestAncestor.length + 1))
            descendantReplaced = true
          } else {
            const updatedDescendantPath = appendToPath(newPath, ...descendant.path.slice(newPath.length))
            const updatedDescendantContext = contextEncode(pathToContext(state, updatedDescendantPath))
            _.unset(tree, contextEncode(pathToContext(state, descendant.path)))
            _.set(tree, updatedDescendantContext, { leaf: true, lastUpdated: timestamp(), path: updatedDescendantPath })
          }
        })
        if (descendantReplaced) nodeChange(state, tree, oldPath, newPath)
        // called once again to remove merge inconsitencty that might occur while replacing descendants by ancestor
        else if (head(oldContext) !== head(newContext)) _.unset(tree, oldContext)
      } else {
        let isMerged = false
        leafNodes.forEach(descendant => {
          const descendantContext = contextEncode(pathToContext(state, descendant.path))
          if (descendantContext[0] === hashThought(EM_TOKEN)) return // preventing nodes at level 0 from merged to this (temporary fix)
          const [shortContext, longContext] =
            newContext.length < descendantContext.length
              ? [newContext, descendantContext]
              : [descendantContext, newContext]

          const isSameDepth = descendantContext.length === newContext.length
          const hasSameParent = newContext.length - commonPath.length === 1
          const isSibling = isSameDepth && hasSameParent

          /*
            If shorter context length and commonPath length differs by more than 1 then then it shouldn't be merged.
            Only merge when it has distant relation i.e A.B.C and A.B.D.E.F.G.H ---> A.B.D.E.F.G.H
          */
          const notMergeableDepthDiff = shortContext.length - commonPath.length > 1
          // for restricting merge of direct cousins like A.B.C.F and A.B.D.E
          const isDirectCousin =
            newContext.length === descendantContext.length && newContext.length - commonPath.length === 2

          // siblings A.B.C and A.B.D ---> A.B.D
          if (isSibling) {
            isMerged = true
            _.unset(tree, descendantContext)
            _.set(tree, newContext, { leaf: true, lastUpdated: timestamp(), path: newPath })
          } else if (!(notMergeableDepthDiff || isDirectCousin)) {
            /*
            restricting merge of direct cousins like A.B.C.F and A.B.D.E
            but merging distant relation A.B.C and A.B.D.E.F.G.H ---> A.B.D.E.F.G.H
          */
            isMerged = true
            _.unset(tree, shortContext.slice(0, commonPath.length + 1))
            _.set(tree, longContext, {
              leaf: true,
              lastUpdated: timestamp(),
              path: newContext.length > descendantContext.length ? newPath : descendant.path,
            })
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
 *
 * @param tree Nested object representing tree.
 * @param [timestampUpdate=true] If false it doesn't update lastUpdated property of all affected leaf nodes (used by nodeMove).
 */
const nodeDelete = (state: State, tree: Tree, oldPath: Path, timestampUpdate = true) => {
  const oldContext = contextEncode(pathToContext(state, oldPath))
  const { node: commonNode, path: commonPath } = findTreeDeepestSubcontext(tree, oldContext)
  if (commonNode) {
    if (oldContext.length > commonPath.length) return // if node is not already available in the tree
    const closestAncestor = findClosestSharedAncestor(tree, commonPath)
    const isPathDepthDiffMergable = commonPath.length - closestAncestor.path.length <= 2
    const nodeToMergeIntoPath = isPathDepthDiffMergable ? closestAncestor.path : null
    if (nodeToMergeIntoPath) {
      /*
      checking all the nodes from the direct parent or grandparent that is a closest shared ancestor , if available updating all the descendants lastUpdated
      For example:

      Recently edited list

      A.B.T.U
      A.B.C.D.E.F
      A.B.C.G.H.I.J
      A.B.C.G.H.K.L

      If A.B.C.D.E is the deleted path then
      closestAncestor with multiple children is A.B.C
      diff between deletedNode (A.B.C.D.E) and closestAncestor (A.B.C) is 2
      Now pathBeingMerged is A.B.C.D and we delete it.
      Then we update all the descendants of closestAncestor i.e A.B.C.G.H.I.J and A.B.C.G.H.K.L.
      */
      const pathBeingMerged = commonPath.slice(0, closestAncestor.path.length + 1)
      _.unset(tree, pathBeingMerged) // deleting the merged path
      findTreeDescendants(state, tree, { startingPath: nodeToMergeIntoPath, showHiddenThoughts: true }).forEach(
        descendant => {
          _.set(tree, contextEncode(pathToContext(state, descendant.path)), {
            leaf: true,
            lastUpdated: timestampUpdate ? timestamp() : descendant.lastUpdated,
            path: descendant.path,
          })
        },
      )
    } else {
      /*
     if cannot be merged to either parent or grandParent then just making parent path as the leaf node

      For example:
      Recently edited list

      A.B.T.U
      A.B.C.D.E.F
      A.B.C.G.H.I.J
      A.B.C.G.H.K.L

      If A.B.C.D.E.F is deleted path
      closestAncestor with multiple children is A.B.C
      Diff between deletedNode (A.B.C.D.E.F) and closestAncestor (A.B.C) is 3.
      So no need to merge into other branches , we just delete A.B.C.D.E.F and set A.B.D.E as leaf node and update it.
     */
      _.unset(tree, commonPath)
      _.set(tree, parentOf(commonPath), {
        leaf: true,
        lastUpdated: timestamp(),
        path: oldPath.slice(0, parentOf(commonPath).length),
      })
    }
  }
}

/**
 * Moves a node between branches in the existing tree object using mutation.
 *
 * @param tree Nested object representing tree.
 * @param oldPath
 * @param newPath
 */
const nodeMove = (state: State, tree: Tree, oldPath: Path, newPath: Path) => {
  const oldContext = contextEncode(pathToContext(state, oldPath))
  const newContext = contextEncode(pathToContext(state, newPath))

  const { node: oldNode, path: commonOldPath } = findTreeDeepestSubcontext(tree, oldContext)
  const { path: commonNewPath } = findTreeDeepestSubcontext(tree, newContext)

  if (oldNode && commonOldPath.length === oldContext.length) {
    // if node is already available
    if (equalArrays(commonOldPath, commonNewPath)) {
      // if moved with in same place (only rank has changed) (to prevent traversing descendants)
      nodeChange(state, tree, oldPath, newPath)
    } else if (oldNode.leaf) {
      nodeAdd(state, tree, newPath)
      nodeDelete(state, tree, oldPath, false)
    } else {
      const descendants = findTreeDescendants(state, tree, { startingPath: oldContext, showHiddenThoughts: true })
      descendants.forEach(descendant => {
        const updatedNewPath = appendToPath(newPath, ...descendant.path.slice(oldPath.length))
        nodeAdd(state, tree, updatedNewPath)
      })
      nodeDelete(state, tree, oldPath, false)
    }
  } else nodeAdd(state, tree, newPath) // if exact node is not found in the tree
}

/** Using immer to pass a draft object as the first argument to the given destructive function to avoid mutation. */
const immerfy =
  <T = any>(f: (state: State, draft: T, ...rest: any[]) => void) =>
  (state: State, obj: T, ...rest: any[]) =>
    produce(obj, (draft: T) => f(state, draft, ...rest))

/**
 * Adds or updates node to the existing tree object.
 *
 * 1. The length of oldPath must be either equal to or less than length of newPath.
 * 2. The difference between length of oldPath and length of commonPath ( subcontext shared between oldPath and newPath ) cannot be more than 1.
 *
 * @param tree Nested object representing tree.
 * @param oldPath
 * @param newPath
 * @returns Updated tree after change.
 */
export const treeChange = immerfy(nodeChange)

/**
 * Deletes node from existing tree object.
 *
 * @param tree Nested object representing tree.
 * @param oldPath
 * @param newPath
 * @returns Updated tree after node delete.
 */
export const treeDelete = immerfy(nodeDelete)

/**
 * Moves a node between branches in the existing tree object.
 *
 * @param tree Nested object representing tree.
 * @param oldPath
 * @param newPath
 * @returns Updated tree after node move.
 */
export const treeMove = immerfy(nodeMove)
