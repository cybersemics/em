import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import moveThought from '../actions/moveThought'
import setCursor from '../actions/setCursor'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild, getChildren, getChildrenRanked, isVisible } from '../selectors/getChildren'
import getPreviousSiblingId from '../selectors/getPreviousSiblingId'
import getSortPreference from '../selectors/getSortPreference'
import getSortedPlacement from '../selectors/getSortedPlacement'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import command from '../util/command'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import deleteThought from './deleteThought'
import sort from './sort'

interface Options {
  at?: Path | null
}

/** Deletes a thought and moves all its children to its parent. */
const uncategorize = (state: State, { at }: Options, transaction?: ThoughtspaceTransaction): State => {
  const { cursor } = state

  const path = at || cursor

  if (!path) return state

  const simplePath = simplifyPath(state, path)
  const children = getChildrenRanked(state, head(simplePath))
  const thought = getThoughtById(state, head(simplePath))

  if (children.length === 0 || !thought) return state

  // Uncategorizing a context in the context view is equivalent to uncategorizing the parent of the cursor SimplePath.
  // The cursor needs to be updated to stay in the context view.
  const isInContextView = isContextViewActive(state, parentOf(path))
  if (isInContextView) {
    return reducerFlow([
      state => uncategorize(state, { at: rootedParentOf(state, simplePath) }, transaction),
      setCursor({
        path: appendToPath(parentOf(path), head(parentOf(parentOf(simplePath)))),
        isKeyboardOpen: state.isKeyboardOpen,
        offset: 0,
      }),
    ])(state, transaction)
  }

  /** Returns first moved child path as new cursor after uncategorize. */
  const getNewCursor = (state: State): Path | null => {
    const firstVisibleChildOfPrevCursor = (state.showHiddenThoughts ? children : children.filter(isVisible(state)))[0]

    if (!firstVisibleChildOfPrevCursor) return path.length > 1 ? parentOf(path) : null

    const parentId = head(rootedParentOf(state, simplePath))
    const childrenOfMovedContext = getChildren(state, parentId)

    const newChild =
      childrenOfMovedContext.find(child => child.id === firstVisibleChildOfPrevCursor.id) || childrenOfMovedContext[0]

    return newChild ? appendToPath(parentOf(path), newChild.id) : null
  }

  // Find the sort preference, if any
  const parentId = head(rootedParentOf(state, simplePath))
  const contextHasSortPreference = getSortPreference(state, head(simplePath)).type !== 'None'
  const parentHasSortPreference = getSortPreference(state, parentId).type !== 'None'
  const sortId = findDescendant(state, head(simplePath), ['=sort'])

  // Find attributes to delete
  const pinAttributeId = findDescendant(state, head(simplePath), '=pin')
  const childrenAttributeId = findDescendant(state, head(simplePath), '=children')
  const childrenPinAttributeId = childrenAttributeId ? findDescendant(state, childrenAttributeId, '=pin') : null
  const shouldDeleteChildrenAttribute =
    childrenAttributeId && !findAnyChild(state, childrenAttributeId, thought => thought.value !== '=pin')
  const descendantsAttributeId = findDescendant(state, head(simplePath), '=descendants')
  const descendantsPinAttributeId = descendantsAttributeId
    ? findDescendant(state, descendantsAttributeId, '=pin')
    : null
  const shouldDeleteDescendantsAttribute =
    descendantsAttributeId && !findAnyChild(state, descendantsAttributeId, thought => thought.value !== '=pin')

  /** Resolves a child's preceding sibling in the current parent before moving it. */
  const getPlacement = (state: State, child: Thought) => {
    if (contextHasSortPreference || parentHasSortPreference)
      return getSortedPlacement(state, parentId, child.value, { staleId: child.id })

    // If we're moving a meta attribute, insert it before the first non-meta child
    if (isAttribute(child.value)) {
      const firstNonMetaChild = findAnyChild(state, parentId, thought => !isAttribute(thought.value))
      return getPreviousSiblingId(state, firstNonMetaChild?.id ?? head(simplePath))
    }

    // Otherwise, insert it before the uncategorized context
    return getPreviousSiblingId(state, head(simplePath))
  }

  return reducerFlow([
    // Sort parent context if sort preference exists and parent does not have a sort preference
    // Sort preference must be moved up before sort to prevent conversion to manual sort.
    contextHasSortPreference && !parentHasSortPreference
      ? reducerFlow([
          moveThought({
            oldPath: appendToPath(simplePath, sortId!),
            newPath: appendToPath(parentOf(simplePath), sortId!),
            afterId: getPreviousSiblingId(state, head(simplePath)),
          }),
          sort(parentId),
        ])
      : null,

    // outdent each child
    ...children.map(child => (state: State) => {
      // Skip =sort since it has already been moved to the parent.
      if (contextHasSortPreference && child.value === '=sort') return state

      return moveThought(
        state,
        {
          oldPath: appendToPath(simplePath, child.id),
          newPath: appendToPath(parentOf(simplePath), child.id),
          afterId: getPlacement(state, child),
          // If a child has the same value as the category being deleted, do not merge it into the category.
          skipMerge: child.value === thought.value,
        },
        transaction,
      )
    }),

    // delete =pin
    pinAttributeId &&
      deleteThought({
        pathParent: parentOf(simplePath),
        thoughtId: pinAttributeId,
      }),
    // delete =children/=pin
    childrenPinAttributeId &&
      deleteThought({
        pathParent: parentOf(simplePath),
        thoughtId: childrenPinAttributeId,
      }),
    // delete =children if it has no remaining children after uncategorizing
    childrenAttributeId && shouldDeleteChildrenAttribute
      ? deleteThought({
          pathParent: parentOf(simplePath),
          thoughtId: childrenAttributeId,
        })
      : null,
    // delete =descendants/=pin
    descendantsPinAttributeId &&
      deleteThought({
        pathParent: parentOf(simplePath),
        thoughtId: descendantsPinAttributeId,
      }),
    // delete =descendants if it has no remaining children after uncategorizing
    descendantsAttributeId && shouldDeleteDescendantsAttribute
      ? deleteThought({
          pathParent: parentOf(simplePath),
          thoughtId: descendantsAttributeId,
        })
      : null,

    // delete the original cursor
    deleteThought({
      pathParent: parentOf(simplePath),
      thoughtId: head(simplePath),
    }),
    // set the new cursor
    state =>
      setCursor(
        state,
        {
          path: getNewCursor(state),
          isKeyboardOpen: state.isKeyboardOpen,
          offset: 0,
        },
        transaction,
      ),
  ])(state, transaction)
}

/** Action-creator for uncategorize. */
export const uncategorizeActionCreator =
  (payload: Parameters<typeof uncategorize>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'uncategorize', ...payload })

export default command(uncategorize)

// Register this action's metadata
registerActionMetadata('uncategorize', {
  undoable: true,
})
