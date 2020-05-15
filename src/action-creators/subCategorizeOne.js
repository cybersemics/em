// action-creators
import newThought from './newThought'
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

export default () => (dispatch, getState) => {

  const state = getState()
  const { cursor } = state

  if (!cursor) return

  // Cancel if a direct child of EM_TOKEN or ROOT_TOKEN
  if (isEM(contextOf(cursor)) || isRoot(contextOf(cursor))) {
    dispatch(error(`Subthoughts of the "${isEM(contextOf(cursor)) ? 'em' : 'home'} context" may not be de-indented.`))
    return
  }
  // cancel if parent is readonly
  else if (meta(state, pathToContext(contextOf(cursor))).readonly) {
    dispatch(error(`"${ellipsize(headValue(contextOf(cursor)))}" is read-only so "${headValue(cursor)}" cannot be subcategorized.`))
    return
  }
  else if (meta(state, pathToContext(contextOf(cursor))).unextendable) {
    dispatch(error(`"${ellipsize(headValue(contextOf(cursor)))}" is unextendable so "${headValue(cursor)}" cannot be subcategorized.`))
    return
  }

  const { rank } = dispatch(newThought({ insertBefore: true }))

  setTimeout(() => {
    dispatch({
      type: 'existingThoughtMove',
      oldPath: cursor,
      newPath: contextOf(cursor).concat({ value: '', rank }, head(cursor))
    })
  }, RENDER_DELAY) // does not work with 0... why not?
}
