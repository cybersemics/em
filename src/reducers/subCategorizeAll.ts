import { RANKED_ROOT } from '../constants'
import { alert, existingThoughtMove, newThought } from '../reducers'
import { State } from '../util/initialState'

// util
import {
  parentOf,
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
  getChildrenRanked,
  hasChild,
  lastThoughtsFromContextChain,
  simplifyPath,
  splitChain,
} from '../selectors'

/** Inserts a new thought as a parent of all thoughts in the given context. */
const subCategorizeAll = (state: State) => {

  const { cursor } = state

  if (!cursor) return state

  const cursorParent = parentOf(cursor)
  const context = pathToContext(cursorParent)

  // cancel if a direct child of EM_TOKEN or ROOT_TOKEN
  if (isEM(cursorParent) || isRoot(cursorParent)) {
    return alert(state, {
      value: `Subthought of the "${isEM(cursorParent) ? 'em' : 'home'} context" may not be de-indented.`
    })
  }
  // cancel if parent is readonly
  else if (hasChild(state, context, '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(cursorParent))}" is read-only so "${headValue(cursor)}" cannot be subcategorized.`
    })
  }
  else if (hasChild(state, context, '=unextendable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(cursorParent))}" is unextendable so "${headValue(cursor)}" cannot be subcategorized.`
    })
  }

  const contextChain = splitChain(state, cursor)
  const path = cursor.length > 1
    ? parentOf(contextChain.length > 1
      ? lastThoughtsFromContextChain(state, contextChain)
      : cursor)
    : RANKED_ROOT

  const children = getChildrenRanked(state, pathToContext(simplifyPath(state, path)))
  const pathParent = cursor.length > 1 ? cursorParent : RANKED_ROOT

  // get newly created thought
  // use fresh state
  const getThoughtNew = perma((state: State) => {
    const parentPath = simplifyPath(state, pathParent)
    const childrenNew = getChildrenRanked(state, pathToContext(parentPath))
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
