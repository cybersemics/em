import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import documentSort from '../selectors/documentSort'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild, getChildren } from '../selectors/getChildren'
import getRankBefore from '../selectors/getRankBefore'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import ellipsize from '../util/ellipsize'
import equalPath from '../util/equalPath'
import head from '../util/head'
import headValue from '../util/headValue'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import alert from './alert'
import createThought from './createThought'
import moveThought from './moveThought'
import setCursor from './setCursor'

export interface categorizePayload {
  /** The value of the new category. Default: '' (an empty category for the user to fill in). */
  value?: string
}

/** Inserts a new thought and adds the given thought as a subthought. */
const categorize = (state: State, { value = '' }: categorizePayload = {}): State => {
  const { cursor } = state

  if (!cursor) return state

  const multicursorPaths = documentSort(state, Object.values(state.multicursors))
  const cursorParent = parentOf(multicursorPaths.length > 0 ? multicursorPaths[0] : cursor)
  const simplePath = simplifyPath(state, multicursorPaths.length > 0 ? multicursorPaths[0] : cursor)

  // Check if all selected thoughts belong to the same parent
  const allSameParent = multicursorPaths.every(path =>
    equalPath(parentOf(simplifyPath(state, path)), parentOf(simplePath)),
  )

  // cancel if a direct child of EM_TOKEN or HOME_TOKEN
  if (isEM(cursorParent) || isRoot(cursorParent)) {
    return alert(state, {
      value: `Subthoughts of the "${isEM(cursorParent) ? 'em' : 'home'}" contex may not be de-indented.`,
    })
  }
  // cancel if parent is readonly
  else if (findDescendant(state, head(cursorParent), '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursorParent) ?? 'MISSING_THOUGHT')}" is read-only so "${headValue(
        state,
        cursor,
      )}" cannot be categorized.`,
    })
  } else if (findDescendant(state, head(cursorParent), '=unextendable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursorParent) ?? 'MISSING_THOUGHT')}" is unextendable so "${headValue(
        state,
        cursor,
      )}" cannot be categorized.`,
    })
  }
  // Check if all selected thoughts belong to the same parent
  else if (!allSameParent) {
    return alert(state, {
      alertType: AlertType.MulticursorError,
      value: 'Cannot categorize thoughts from different parents.',
    })
  }

  const newRank = getRankBefore(state, simplePath)
  const newThoughtId = createId()
  const isInContextView = isContextViewActive(state, parentOf(cursor))

  // When every visible sibling is selected, the parent's view options — =view, =pin, =sort, =children/=pin, and
  // =descendants/=pin — describe the very thoughts being wrapped, so they follow them into the new category. A partial
  // selection leaves them on the parent, which keeps unselected children. An attribute that is itself selected
  // (visible via showHiddenThoughts) is already moved by the selection.
  const parentId = head(rootedParentOf(state, simplePath))
  const selectedIds = new Set(multicursorPaths.map(path => head(simplifyPath(state, path))))
  const allSelected =
    multicursorPaths.length > 0 && getChildren(state, parentId).every(child => selectedIds.has(child.id))
  const movedAttributes = allSelected
    ? ['=view', '=pin', '=sort'].flatMap(value => {
        const id = findDescendant(state, parentId, value)
        const thought = id && !selectedIds.has(id) ? getThoughtById(state, id) : null
        return thought ? [thought] : []
      })
    : []
  // A =pin scoped through =children or =descendants moves too, but its container may hold attributes that stay behind
  // (e.g. =children/=style), so the whole container moves only when =pin is its only child. Otherwise only =pin moves,
  // into a fresh container created in the category, identified here by a non-null newContainerId.
  const movedScopedPins = allSelected
    ? ['=children', '=descendants'].flatMap(value => {
        const containerId = findDescendant(state, parentId, value)
        const container = containerId && !selectedIds.has(containerId) ? getThoughtById(state, containerId) : null
        const pinId = container ? findDescendant(state, container.id, '=pin') : null
        const pin = pinId ? getThoughtById(state, pinId) : null
        const pinOnly = container ? !findAnyChild(state, container.id, child => child.value !== '=pin') : false
        return container && pin ? [{ container, pin, newContainerId: pinOnly ? null : createId() }] : []
      })
    : []

  return reducerFlow([
    createThought({
      path: rootedParentOf(state, simplePath),
      value,
      rank: newRank,
      id: newThoughtId,
    }),
    ...(multicursorPaths.length === 0
      ? [
          moveThought({
            oldPath: simplePath,
            newPath: appendToPath(
              isInContextView ? rootedParentOf(state, simplePath) : cursorParent,
              newThoughtId,
              head(simplePath),
            ),
            newRank,
          }),
        ]
      : multicursorPaths
          .reverse()
          // we ignore thoughts at cursor that are somehow missing, see getThoughtById
          .filter(path => getThoughtById(state, head(path)))
          .map(path =>
            moveThought({
              oldPath: path,
              newPath: appendToPath(parentOf(simplePath), newThoughtId, head(path)),
              newRank: getThoughtById(state, head(path))!.rank,
            }),
          )),
    ...movedAttributes.map(attribute =>
      moveThought({
        oldPath: appendToPath(parentOf(simplePath), attribute.id),
        newPath: appendToPath(parentOf(simplePath), newThoughtId, attribute.id),
        newRank: attribute.rank,
      }),
    ),
    ...movedScopedPins.map(({ container, pin, newContainerId }) =>
      newContainerId
        ? reducerFlow([
            createThought({
              path: appendToPath(parentOf(simplePath), newThoughtId),
              value: container.value,
              rank: container.rank,
              id: newContainerId,
            }),
            moveThought({
              oldPath: appendToPath(parentOf(simplePath), container.id, pin.id),
              newPath: appendToPath(parentOf(simplePath), newThoughtId, newContainerId, pin.id),
              newRank: pin.rank,
            }),
          ])
        : moveThought({
            oldPath: appendToPath(parentOf(simplePath), container.id),
            newPath: appendToPath(parentOf(simplePath), newThoughtId, container.id),
            newRank: container.rank,
          }),
    ),
    setCursor({
      path: appendToPath(cursorParent, newThoughtId),
      // Place the caret at the end of the category so the user can keep typing where its value leaves off. For the
      // default empty category this is the usual offset 0.
      offset: value.length,
      isKeyboardOpen: true,
    }),
  ])(state)
}

/** A Thunk that dispatches a 'categorize` action. */
export const categorizeActionCreator =
  (payload?: categorizePayload): Thunk =>
  dispatch =>
    dispatch({ type: 'categorize', ...payload })

export default categorize

// Register this action's metadata
registerActionMetadata('categorize', {
  undoable: true,
})
