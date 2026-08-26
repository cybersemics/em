import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import contextThoughtId from '../selectors/contextThoughtId'
import documentSort from '../selectors/documentSort'
import findDescendant from '../selectors/findDescendant'
import getRankBefore from '../selectors/getRankBefore'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import ellipsize from '../util/ellipsize'
import equalPath from '../util/equalPath'
import head from '../util/head'
import headId from '../util/headId'
import headValue from '../util/headValue'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import { isContextStep } from '../util/pathStep'
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
  const allSameParent = multicursorPaths.every(path => equalPath(parentOf(path), parentOf(simplePath)))

  // The metaprogramming attributes that govern the destination belong to the thought the user sees there, which in the
  // context view is the context rather than the Lexeme instance. Null when the cursor is a root child, which has no
  // parent thought to check.
  const cursorParentId = cursorParent.length > 0 ? contextThoughtId(state, cursorParent) : null

  // cancel if a direct child of EM_TOKEN or HOME_TOKEN
  if (isEM(cursorParent) || isRoot(cursorParent)) {
    return alert(state, {
      value: `Subthoughts of the "${isEM(cursorParent) ? 'em' : 'home'}" contex may not be de-indented.`,
    })
  }
  // cancel if parent is readonly
  else if (findDescendant(state, cursorParentId, '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursorParent) ?? 'MISSING_THOUGHT')}" is read-only so "${headValue(
        state,
        cursor,
      )}" cannot be categorized.`,
    })
  } else if (findDescendant(state, cursorParentId, '=unextendable')) {
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
  // the head step records whether the cursor is a context rendered in a context view
  const isInContextView = isContextStep(head(cursor))

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
          .filter(path => getThoughtById(state, headId(path)))
          .map(path =>
            moveThought({
              oldPath: path,
              newPath: appendToPath(parentOf(simplePath), newThoughtId, headId(path)),
              newRank: getThoughtById(state, headId(path))!.rank,
            }),
          )),
    setCursor({
      // In the context view the row is addressed by its Lexeme instance, which has just been moved under the new
      // category — so the cursor's own step still names it, and only the context it displays has changed. Building a
      // plain step from the category id instead would name a row that is not rendered.
      path: isInContextView ? cursor : appendToPath(cursorParent, newThoughtId),
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
