// constants
import {
  RANKED_ROOT,
} from '../constants'

// util
import {
  contextOf,
  ellipsize,
  headValue,
  isEM,
  isRoot,
  pathToContext,
  perma,
  reducerFlow,
} from '../util'

// selectors
import {
  getThoughtsRanked,
  lastThoughtsFromContextChain,
  meta,
  pathToThoughtsRanked,
  splitChain,
} from '../selectors'

// reducers
import existingThoughtMove from './existingThoughtMove'
import newThought from './newThought'

/** Inserts a new thought as a parent of all thoughts in the given context. */
export default state => {

  const { cursor } = state

  if (!cursor) return

  const cursorParent = contextOf(cursor)
  const contextMeta = meta(state, pathToContext(cursorParent))

  // cancel if a direct child of EM_TOKEN or ROOT_TOKEN
  if (isEM(cursorParent) || isRoot(cursorParent)) {
    return {
      type: 'error',
      value: `Subthought of the "${isEM(cursorParent) ? 'em' : 'home'} context" may not be de-indented.`
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

  const contextChain = splitChain(state, cursor)
  const thoughtsRanked = cursor.length > 1
    ? contextOf(contextChain.length > 1
      ? lastThoughtsFromContextChain(state, contextChain)
      : cursor)
    : RANKED_ROOT

  const children = getThoughtsRanked(state, thoughtsRanked)
  const pathParent = cursor.length > 1 ? cursorParent : RANKED_ROOT

  // get newly created thought
  // use fresh state
  const getThoughtNew = perma(state => {
    const parentThoughtsRanked = pathToThoughtsRanked(state, pathParent)
    const childrenNew = getThoughtsRanked(state, pathToContext(parentThoughtsRanked))
    return childrenNew[0]
  })

  const reducers = [
    // create new parent
    state => newThought(state, {
      at: pathParent,
      insertNewSubthought: true,
      insertBefore: true
    }),

    // move children
    ...children.map(child =>
      state => existingThoughtMove(state, {
        oldPath: cursorParent.concat(child),
        newPath: cursorParent.concat(getThoughtNew(state), child)
      })
    )
  ]

  return reducerFlow(reducers)(state)
}
