// action-creators
import error from './error'

// util
import {
  contextOf,
  ellipsize,
  headValue,
  isEM,
  isRoot,
  pathToContext,
  rootedContextOf,
  unroot,
} from '../util'

// selectors
import { getRankAfter, meta } from '../selectors'

export default () => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state
  if (cursor && cursor.length > 1) {

    // Cancel if a direct child of EM_TOKEN or ROOT_TOKEN
    if (isEM(contextOf(cursor)) || isRoot(contextOf(cursor))) {
      dispatch(error(`Subthought of the "${isEM(contextOf(cursor)) ? 'em' : 'home'} context" may not be de-indented.`))
      return
    }
    // cancel if parent is readonly or unextendable
    else if (meta(state, pathToContext(contextOf(cursor))).readonly) {
      dispatch(error(`"${ellipsize(headValue(contextOf(cursor)))}" is read-only so "${headValue(cursor)}" may not be de-indented.`))
      return
    }
    else if (meta(state, pathToContext(contextOf(cursor))).unextendable) {
      dispatch(error(`"${ellipsize(headValue(contextOf(cursor)))}" is unextendable so "${headValue(cursor)}" may not be de-indented.`))
      return
    }

    // store selection offset before existingThoughtMove is dispatched
    const offset = window.getSelection().focusOffset

    const cursorNew = unroot(rootedContextOf(contextOf(cursor)).concat({
      value: headValue(cursor),
      rank: getRankAfter(state, contextOf(cursor))
    }))

    dispatch({
      type: 'existingThoughtMove',
      oldPath: cursor,
      newPath: cursorNew,
      offset
    })
  }
}
