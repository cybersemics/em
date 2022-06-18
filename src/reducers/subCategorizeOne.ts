import alert from '../reducers/alert'
import moveThought from '../reducers/moveThought'
import createThought from '../reducers/createThought'
import setCursor from '../reducers/setCursor'
import getRankBefore from '../selectors/getRankBefore'
import findDescendant from '../selectors/findDescendant'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import State from '../@types/State'
import appendToPath from '../util/appendToPath'
import parentOf from '../util/parentOf'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import isEM from '../util/isEM'
import pathToContext from '../util/pathToContext'
import reducerFlow from '../util/reducerFlow'
import isRoot from '../util/isRoot'
import createId from '../util/createId'

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
  }

  const simplePath = simplifyPath(state, cursor)
  const newRank = getRankBefore(state, simplePath)

  const value = ''

  const newThoughtId = createId()

  return reducerFlow([
    createThought({
      context: pathToContext(state, rootedParentOf(state, simplePath)),
      value,
      rank: newRank,
      id: newThoughtId,
    }),
    setCursor({
      path: appendToPath(cursorParent, newThoughtId),
      offset: 0,
      editing: true,
    }),
    state =>
      moveThought(state, {
        oldPath: cursor,
        newPath: appendToPath(cursorParent, newThoughtId, head(cursor)),
        newRank,
      }),
  ])(state)
}

export default subCategorizeOne
