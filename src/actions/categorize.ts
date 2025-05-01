import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import documentSort from '../selectors/documentSort'
import findDescendant from '../selectors/findDescendant'
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

/** Inserts a new thought and adds the given thought as a subthought. */
const categorize = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const multicursorPaths = documentSort(state, Object.values(state.multicursors))
  const cursorParent = parentOf(multicursorPaths.length > 0 ? multicursorPaths[0] : cursor)
  const simplePath = simplifyPath(state, multicursorPaths.length > 0 ? multicursorPaths[0] : cursor)

  // Check if all selected thoughts belong to the same parent
  const allSameParent = multicursorPaths.every(path => equalPath(parentOf(path), parentOf(simplePath)))

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

  return reducerFlow([
    createThought({
      path: rootedParentOf(state, simplePath),
      value: '',
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
    setCursor({
      path: appendToPath(cursorParent, newThoughtId),
      offset: 0,
      editing: true,
    }),
  ])(state)
}

/** A Thunk that dispatches a 'categorize` action. */
export const categorizeActionCreator = (): Thunk => dispatch => dispatch({ type: 'categorize' })

export default categorize

// Register this action's metadata
registerActionMetadata('categorize', {
  undoable: true,
})
