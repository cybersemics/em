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

// selectors
import {
  getThoughtBefore,
  meta,
  pathToThoughtsRanked,
} from '../selectors'

// reducers
import newThought from './newThought'
import existingThoughtMove from './existingThoughtMove'

/** Inserts a new thought and adds the given thought as a subthought. */
export default state => {

  const { cursor } = state

  if (!cursor) return state

  const cursorParent = contextOf(cursor)
  const contextMeta = meta(state, pathToContext(cursorParent))

  // cancel if a direct child of EM_TOKEN or ROOT_TOKEN
  if (isEM(cursorParent) || isRoot(cursorParent)) {
    return {
      type: 'error',
      value: `Subthoughts of the "${isEM(cursorParent) ? 'em' : 'home'}" contex may not be de-indented.`
    }
  }
  // cancel if parent is readonly
  else if (contextMeta.readonly) {
    return {
      type: 'error',
      value: `"${ellipsize(headValue(cursorParent))}" is read-only so "${headValue(cursor)}" cannot be subcategorized.`
    }
  }
  else if (contextMeta.unextendable) {
    return {
      type: 'error',
      value: `"${ellipsize(headValue(cursorParent))}" is unextendable so "${headValue(cursor)}" cannot be subcategorized.`
    }
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
