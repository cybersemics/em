import { RANKED_ROOT } from '../constants'
import { error, existingThoughtMove, newThought } from '../reducers'
import { State } from '../util/initialState'

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
  hasChild,
  lastThoughtsFromContextChain,
  pathToThoughtsRanked,
  splitChain,
} from '../selectors'

/** Inserts a new thought as a parent of all thoughts in the given context. */
const subCategorizeAll = (state: State) => {

  const { cursor } = state

  if (!cursor) return state

  const cursorParent = contextOf(cursor)
  const context = pathToContext(cursorParent)

  // cancel if a direct child of EM_TOKEN or ROOT_TOKEN
  if (isEM(cursorParent) || isRoot(cursorParent)) {
    return error(state, {
      value: `Subthought of the "${isEM(cursorParent) ? 'em' : 'home'} context" may not be de-indented.`
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
  const getThoughtNew = perma((state: State) => {
    const parentThoughtsRanked = pathToThoughtsRanked(state, pathParent)
    const childrenNew = getThoughtsRanked(state, pathToContext(parentThoughtsRanked))
    return childrenNew[0]
  })

  const reducers = [
    // create new parent
    (state: State) => newThought(state, {
      at: pathParent,
      insertNewSubthought: true,
      insertBefore: true
    }),

    // move children
    ...children.map(child =>
      (state: State) => existingThoughtMove(state, {
        oldPath: cursorParent.concat(child),
        newPath: cursorParent.concat(getThoughtNew(state), child)
      })
    )
  ]

  return reducerFlow(reducers)(state)
}

export default subCategorizeAll
