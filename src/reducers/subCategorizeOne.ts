import { alert, existingThoughtMove, newThought } from '../reducers'
import { getThoughtBefore, hasChild, simplifyPath } from '../selectors'
import { State } from '../util/initialState'
import { Child } from '../types'

// util
import {
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

  /** Gets the last created thought insserted before the cursor. */
  const thoughtNew = (state: State) => {
    const path = simplifyPath(state, cursor)
    return getThoughtBefore(state, path)
  }

  return reducerFlow([
    newThought({ insertBefore: true }),
    state => existingThoughtMove(state, {
      oldPath: cursor,
      newPath: cursorParent.concat(thoughtNew(state) as Child, head(cursor))
    })
  ])(state)
}

export default subCategorizeOne
