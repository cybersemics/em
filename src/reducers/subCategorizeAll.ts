import { HOME_PATH } from '../constants'
import { alert, moveThought, newThought } from '../reducers'
import {
  appendToPath,
  parentOf,
  ellipsize,
  fixPathId,
  headValue,
  isEM,
  pathToContext,
  once,
  reducerFlow,
  isRoot,
} from '../util'
import { getChildrenRanked, hasChild, lastThoughtsFromContextChain, simplifyPath, splitChain } from '../selectors'
import { State } from '../@types'

// attributes that apply to the parent and should not be moved with subCategorizeAll
const stationaryMetaAttributes = {
  '=archive': true,
  '=bullet': true,
  '=focus': true,
  '=label': true,
  '=note': true,
  '=pin': true,
  '=publish': true,
}

/** Inserts a new thought as a parent of all thoughts in the given context. */
const subCategorizeAll = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const cursorParent = parentOf(cursor)
  const context = pathToContext(cursorParent)

  // cancel if a direct child of EM_TOKEN or HOME_TOKEN
  if (isEM(cursorParent) || isRoot(cursorParent)) {
    return alert(state, {
      value: `Subthought of the "${isEM(cursorParent) ? 'em' : 'home'} context" may not be de-indented.`,
    })
  }
  // cancel if parent is readonly
  else if (hasChild(state, context, '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(cursorParent))}" is read-only so "${headValue(cursor)}" cannot be subcategorized.`,
    })
  } else if (hasChild(state, context, '=unextendable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(cursorParent))}" is unextendable so "${headValue(
        cursor,
      )}" cannot be subcategorized.`,
    })
  }

  const contextChain = splitChain(state, cursor)
  const path =
    cursor.length > 1
      ? parentOf(contextChain.length > 1 ? lastThoughtsFromContextChain(state, contextChain) : cursor)
      : HOME_PATH

  const children = getChildrenRanked(state, pathToContext(simplifyPath(state, path)))
  const pathParent = cursor.length > 1 ? cursorParent : HOME_PATH

  // filter out meta children that should not be moved
  const filteredChildren = children.filter(child => !(child.value in stationaryMetaAttributes))

  // get newly created thought
  // use fresh state
  const getThoughtNew = once((state: State) => {
    const parentPath = simplifyPath(state, pathParent)
    const childrenNew = getChildrenRanked(state, pathToContext(parentPath))
    return childrenNew[0]
  })

  const reducers = [
    // create new parent
    (state: State) =>
      newThought(state, {
        at: pathParent,
        insertNewSubthought: true,
        insertBefore: true,
        // insert the new empty thought above meta attributes since they will all be moved even when hidden
        aboveMeta: true,
      }),

    // move children
    ...filteredChildren.map(
      child => (state: State) =>
        moveThought(state, {
          oldPath: fixPathId(appendToPath(cursorParent, child)),
          newPath: fixPathId(appendToPath(cursorParent, getThoughtNew(state), child)),
        }),
    ),
  ]

  return reducerFlow(reducers)(state)
}

export default subCategorizeAll
