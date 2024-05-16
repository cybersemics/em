import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import createThought from '../actions/createThought'
import moveThought from '../actions/moveThought'
import setCursor from '../actions/setCursor'
import findDescendant from '../selectors/findDescendant'
import getRankBefore from '../selectors/getRankBefore'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'

/** Inserts a new thought and adds the given thought as a subthought. */
const subCategorizeOne = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const cursorParent = parentOf(cursor)

  // cancel if a direct child of EM_TOKEN or HOME_TOKEN
  if (isEM(cursorParent) || isRoot(cursorParent)) {
    return alert(state, {
      value: `Subthoughts of the "${isEM(cursorParent) ? 'em' : 'home'}" contex may not be de-indented.`,
    })
  }
  // cancel if parent is readonly
  else if (findDescendant(state, head(cursorParent), '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursorParent))}" is read-only so "${headValue(
        state,
        cursor,
      )}" cannot be subcategorized.`,
    })
  } else if (findDescendant(state, head(cursorParent), '=unextendable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursorParent))}" is unextendable so "${headValue(
        state,
        cursor,
      )}" cannot be subcategorized.`,
    })
  } else if (isContextViewActive(state, parentOf(cursor))) {
    return alert(state, {
      value: `Contexts may not be subcategorized in the context view.`,
    })
  }

  const simplePath = simplifyPath(state, cursor)
  const newRank = getRankBefore(state, simplePath)
  const newThoughtId = createId()

  return reducerFlow([
    createThought({
      path: rootedParentOf(state, simplePath),
      value: '',
      rank: newRank,
      id: newThoughtId,
    }),
    setCursor({
      path: appendToPath(cursorParent, newThoughtId),
      offset: 0,
      editing: true,
    }),
    moveThought({
      oldPath: simplePath,
      newPath: appendToPath(cursorParent, newThoughtId, head(simplePath)),
      newRank,
    }),
  ])(state)
}

/** A Thunk that dispatches a 'subCategorizeOne` action. */
export const subCategorizeOneActionCreator = (): Thunk => dispatch => dispatch({ type: 'subCategorizeOne' })

export default subCategorizeOne
