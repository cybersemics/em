import { error, existingThoughtMove, newThought } from '../reducers'
import { getThoughtBefore, hasChild, pathToThoughtsRanked } from '../selectors'

// util
import {
  contextOf,
  ellipsize,
  head,
  headValue,
  isEM,
  isRoot,
  pathToContext,
  reducerFlow,
} from '../util'

/** Inserts a new thought and adds the given thought as a subthought. */
const subCategorizeOne = state => {

  const { cursor } = state

  if (!cursor) return state

  const cursorParent = contextOf(cursor)
  const context = pathToContext(cursorParent)

  // cancel if a direct child of EM_TOKEN or ROOT_TOKEN
  if (isEM(cursorParent) || isRoot(cursorParent)) {
    return error(state, {
      value: `Subthoughts of the "${isEM(cursorParent) ? 'em' : 'home'}" contex may not be de-indented.`
    })
  }
  // cancel if parent is readonly
  else if (hasChild(state, context, '=readonly')) {
    return error(state, {
      value: `"${ellipsize(headValue(cursorParent))}" is read-only so "${headValue(cursor)}" cannot be subcategorized.`
    })
  }
  else if (hasChild(state, context, '=unextendable')) {
    return error(state, {
      value: `"${ellipsize(headValue(cursorParent))}" is unextendable so "${headValue(cursor)}" cannot be subcategorized.`
    })
  }

  /** Gets the last created thought insserted before the cursor. */
  const thoughtNew = state => {
    const thoughtsRanked = pathToThoughtsRanked(state, cursor)
    return getThoughtBefore(state, thoughtsRanked)
  }

  return reducerFlow([
    state => newThought(state, { insertBefore: true }),
    state => existingThoughtMove(state, {
      oldPath: cursor,
      newPath: cursorParent.concat(thoughtNew(state), head(cursor))
    })
  ])(state)
}

export default subCategorizeOne
