// action-creators
import error from './error'

// constants-creators
import {
  RENDER_DELAY,
} from '../constants'

// util
import {
  contextOf,
  ellipsize,
  head,
  headValue,
  isEM,
  isRoot,
  pathToContext,
} from '../util'

// selectors
import { meta } from '../selectors'

/** Inserts a new thought and adds the given thought as a subthought. */
export default () => (dispatch, getState) => {

  const state = getState()
  const { cursor } = state

  if (!cursor) return

  const cursorParent = contextOf(cursor)
  const contextMeta = meta(state, pathToContext(cursorParent))

  // cancel if a direct child of EM_TOKEN or ROOT_TOKEN
  if (isEM(cursorParent) || isRoot(cursorParent)) {
    dispatch(error(`Subthoughts of the "${isEM(cursorParent) ? 'em' : 'home'}" contex may not be de-indented.`))
    return
  }
  // cancel if parent is readonly
  else if (contextMeta.readonly) {
    dispatch(error(`"${ellipsize(headValue(cursorParent))}" is read-only so "${headValue(cursor)}" cannot be subcategorized.`))
    return
  }
  else if (contextMeta.unextendable) {
    dispatch(error(`"${ellipsize(headValue(cursorParent))}" is unextendable so "${headValue(cursor)}" cannot be subcategorized.`))
    return
  }

  const { newRank: rank } = dispatch({ type: 'newThought', insertBefore: true })

  setTimeout(() => {
    dispatch({
      type: 'existingThoughtMove',
      oldPath: cursor,
      newPath: cursorParent.concat({ value: '', rank }, head(cursor))
    })
  }, RENDER_DELAY) // does not work with 0... why not?
}
