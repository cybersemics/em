import { store } from '../store.js'

// action-creators
import { newThought } from './newThought'
import { error } from './error.js'

// constants
import {
  RENDER_DELAY,
} from '../constants.js'

// util
import {
  contextOf,
  ellipsize,
  head,
  headValue,
  meta,
  pathToContext,
  isEM,
  isRoot
} from '../util.js'

export const subCategorizeOne = () => dispatch => {
  const { cursor } = store.getState()

  if (!cursor) return

  // Cancel if a direct child of EM_TOKEN or ROOT_TOKEN
  if (isEM(contextOf(cursor)) || isRoot(contextOf(cursor))) {
    error(`Child of "${isEM(contextOf(cursor)) ? 'em context' : 'home context'}" may not be de-indented.`)
    return
  }
  // cancel if parent is readonly
  else if (meta(pathToContext(contextOf(cursor))).readonly) {
    error(`"${ellipsize(headValue(contextOf(cursor)))}" is read-only so "${headValue(cursor)}" cannot be subcategorized.`)
    return
  }
  else if (meta(pathToContext(contextOf(cursor))).unextendable) {
    error(`"${ellipsize(headValue(contextOf(cursor)))}" is unextendable so "${headValue(cursor)}" cannot be subcategorized.`)
    return
  }

  const { rank } = dispatch(newThought({ insertBefore: true }))
  setTimeout(() => {
    dispatch({
      type: 'existingThoughtMove',
      oldPath: cursor,
      newPath: contextOf(cursor).concat({ value: '', rank }, head(cursor))
    })
  }, RENDER_DELAY)
}
