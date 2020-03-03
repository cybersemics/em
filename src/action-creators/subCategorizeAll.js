import { store } from '../store.js'

// action-creators
import { newThought } from './newThought'
import { error } from './error.js'

// constants
import {
  RANKED_ROOT,
  RENDER_DELAY,
} from '../constants.js'

// util
import {
  contextOf,
  ellipsize,
  getThoughtsRanked,
  headValue,
  lastThoughtsFromContextChain,
  meta,
  pathToContext,
  splitChain,
} from '../util.js'

export const subCategorizeAll = () => dispatch => {

  const { contextViews, cursor } = store.getState().present
  if (!cursor) return

  // cancel if parent is readonly
  if (meta(pathToContext(contextOf(cursor))).readonly) {
    error(`"${ellipsize(headValue(contextOf(cursor)))}" is read-only so "${headValue(cursor)}" cannot be subcategorized.`)
    return
  }
  else if (meta(pathToContext(contextOf(cursor))).unextendable) {
    error(`"${ellipsize(headValue(contextOf(cursor)))}" is unextendable so "${headValue(cursor)}" cannot be subcategorized.`)
    return
  }

  const contextChain = splitChain(cursor, contextViews)
  const thoughtsRanked = cursor.length > 1
    ? (contextOf(contextChain.length > 1
      ? lastThoughtsFromContextChain(contextChain)
      : cursor))
    : RANKED_ROOT

  const children = getThoughtsRanked(thoughtsRanked)

  const { rank } = dispatch(newThought({
    at: cursor.length > 1 ? contextOf(cursor) : RANKED_ROOT,
    insertNewSubthought: true,
    insertBefore: true
  }))

  setTimeout(() => {
    children.forEach(child => {
      dispatch({
        type: 'existingThoughtMove',
        oldPath: contextOf(cursor).concat(child),
        newPath: contextOf(cursor).concat({ value: '', rank }, child)
      })
    })
  }, RENDER_DELAY)
}
