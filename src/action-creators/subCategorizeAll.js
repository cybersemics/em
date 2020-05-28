// action-creators
import error from './error'

// constants
import {
  RANKED_ROOT,
  RENDER_DELAY,
} from '../constants'

// util
import {
  contextOf,
  ellipsize,
  headValue,
  isEM,
  isRoot,
  pathToContext,
} from '../util'

// selectors
import {
  getThoughtsRanked,
  lastThoughtsFromContextChain,
  meta,
  pathToThoughtsRanked,
  splitChain,
} from '../selectors'

/** Inserts a new thought as a parent of all thoughts in the given context. */
export default () => (dispatch, getState) => {

  const state = getState()
  const { cursor } = state

  if (!cursor) return

  const cursorParent = contextOf(cursor)
  const contextMeta = meta(state, pathToContext(cursorParent))

  // cancel if a direct child of EM_TOKEN or ROOT_TOKEN
  if (isEM(cursorParent) || isRoot(cursorParent)) {
    dispatch(error(`Subthought of the "${isEM(cursorParent) ? 'em' : 'home'} context" may not be de-indented.`))
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

  const contextChain = splitChain(state, cursor)
  const thoughtsRanked = cursor.length > 1
    ? contextOf(contextChain.length > 1
      ? lastThoughtsFromContextChain(state, contextChain)
      : cursor)
    : RANKED_ROOT

  const children = getThoughtsRanked(state, thoughtsRanked)
  const pathParent = cursor.length > 1 ? cursorParent : RANKED_ROOT

  dispatch({ type: 'newThought',
    at: pathParent,
    insertNewSubthought: true,
    insertBefore: true
  })

  // get newly created thought
  // use fresh state
  const parentThoughtsRanked = pathToThoughtsRanked(getState(), pathParent)
  const childrenNew = getThoughtsRanked(getState(), pathToContext(parentThoughtsRanked))
  const thoughtNew = childrenNew[0]

  setTimeout(() => {
    children.forEach(child => {
      dispatch({
        type: 'existingThoughtMove',
        oldPath: cursorParent.concat(child),
        newPath: cursorParent.concat(thoughtNew, child)
      })
    })
  }, RENDER_DELAY)
}
