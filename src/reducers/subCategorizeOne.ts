import { alert, moveThought, createThought, setCursor } from '../reducers'
import { getRankBefore, hasChild, rootedParentOf, simplifyPath } from '../selectors'
import { State } from '../@types'
import {
  appendToPath,
  parentOf,
  ellipsize,
  head,
  headValue,
  isEM,
  pathToContext,
  reducerFlow,
  isRoot,
  createId,
} from '../util'

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
  else if (hasChild(state, head(cursorParent), '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursorParent))}" is read-only so "${headValue(
        state,
        cursor,
      )}" cannot be subcategorized.`,
    })
  } else if (hasChild(state, head(cursorParent), '=unextendable')) {
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
