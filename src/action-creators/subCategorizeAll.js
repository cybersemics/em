import { store } from '../store.js'

// action-creators
import { newThought } from './newThought'

// constants
import {
  RANKED_ROOT,
  RENDER_DELAY,
} from '../constants.js'

// util
import {
  getThoughtsRanked,
  contextOf,
  lastThoughtsFromContextChain,
  splitChain,
} from '../util.js'

export const subCategorizeAll = () => dispatch => {

  const { contextViews, cursor } = store.getState()

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
