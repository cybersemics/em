import { alert, existingThoughtMove, newThoughtSubmit, setCursor } from '../reducers'
import { getRankBefore, hasChild, rootedParentOf, simplifyPath } from '../selectors'
import { State } from '../util/initialState'
import { Child } from '../types'

// util
import {
  createId,
  parentOf,
  ellipsize,
  head,
  headValue,
  isEM,
  pathToContext,
  reducerFlow,
  isRoot,
} from '../util'

/** Inserts a new thought and adds the given thought as a subthought. */
const subCategorizeOne = (state: State) => {

  const { cursor } = state

  if (!cursor) return state

  const cursorParent = parentOf(cursor)
  const context = pathToContext(cursorParent)

  // cancel if a direct child of EM_TOKEN or HOME_TOKEN
  if (isEM(cursorParent) || isRoot(cursorParent)) {
    return alert(state, {
      value: `Subthoughts of the "${isEM(cursorParent) ? 'em' : 'home'}" contex may not be de-indented.`
    })
  }
  // cancel if parent is readonly
  else if (hasChild(state, context, '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(cursorParent))}" is read-only so "${headValue(cursor)}" cannot be subcategorized.`
    })
  }
  else if (hasChild(state, context, '=unextendable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(cursorParent))}" is unextendable so "${headValue(cursor)}" cannot be subcategorized.`
    })
  }

  const simplePath = simplifyPath(state, cursor)
  const newRank = getRankBefore(state, simplePath)

  const child: Child = {
    rank: newRank,
    value: '',
    id: createId()
  }

  return reducerFlow([
    newThoughtSubmit({
      context: pathToContext(rootedParentOf(state, simplePath)),
      ...child
    }),
    setCursor({
      path: cursorParent.concat(child),
      offset: 0,
      editing: true
    }),
    state => existingThoughtMove(state, {
      oldPath: cursor,
      newPath: cursorParent.concat(child, head(cursor))
    })
  ])(state)
}

export default subCategorizeOne
