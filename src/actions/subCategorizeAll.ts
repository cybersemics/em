import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import moveThought from '../actions/moveThought'
import newThought from '../actions/newThought'
import { HOME_PATH } from '../constants'
import findDescendant from '../selectors/findDescendant'
import { getChildrenRanked } from '../selectors/getChildren'
import isContextViewActive from '../selectors/isContextViewActive'
import lastThoughtsFromContextChain from '../selectors/lastThoughtsFromContextChain'
import simplifyPath from '../selectors/simplifyPath'
import splitChain from '../selectors/splitChain'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import once from '../util/once'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'

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

  // cancel if a direct child of EM_TOKEN or HOME_TOKEN
  if (isEM(cursorParent) || isRoot(cursorParent)) {
    return alert(state, {
      value: `Subthought of the "${isEM(cursorParent) ? 'em' : 'home'} context" may not be de-indented.`,
    })
  }
  // cancel if parent is readonly
  else if (findDescendant(state, head(cursorParent), '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursorParent))}" is read-only so "${headValue(
        state,
        cursor,
      )}" cannot be subcategorized.`,
    })
  } else if (findDescendant(state, head(cursorParent), '=unextendable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursorParent))}" is unextendable so "${headValue(
        state,
        cursor,
      )}" cannot be subcategorized.`,
    })
  } else if (isContextViewActive(state, parentOf(cursor))) {
    return alert(state, {
      value: `Contexts may not be subcategorized in the context view.`,
    })
  }

  const contextChain = splitChain(state, cursor)
  const path =
    cursor.length > 1
      ? parentOf(contextChain.length > 1 ? lastThoughtsFromContextChain(state, contextChain) : cursor)
      : HOME_PATH

  const children = getChildrenRanked(state, head(simplifyPath(state, path)))
  const pathParent = cursor.length > 1 ? cursorParent : HOME_PATH

  // filter out meta children that should not be moved
  const filteredChildren = children.filter(child => !(child.value in stationaryMetaAttributes))

  // get newly created thought
  // use fresh state
  const getThoughtNew = once((state: State) => {
    const parentPath = simplifyPath(state, pathParent)
    const childrenNew = getChildrenRanked(state, head(parentPath))
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
          oldPath: appendToPath(path, child.id),
          newPath: appendToPath(path, getThoughtNew(state).id, child.id),
          newRank: child.rank,
        }),
    ),
  ]

  return reducerFlow(reducers)(state)
}

/** A Thunk that dispatches a 'subCategorizeAll` action. */
export const subCategorizeAllActionCreator = (): Thunk => dispatch => dispatch({ type: 'subCategorizeAll' })

export default subCategorizeAll
