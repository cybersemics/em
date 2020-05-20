import error from './error'

// util
import {
  contextOf,
  ellipsize,
  headRank,
  headValue,
  pathToContext,
  rootedContextOf,
} from '../util'

// selectors
import { getNextRank, getRankBefore, getSortPreference, getThoughtBefore, meta, prevSibling } from '../selectors'

/** Swaps the thought with its previous siblings. */
export default () => (dispatch, getState) => {

  const state = getState()
  const { cursor } = state

  if (!cursor) return

  const context = contextOf(cursor)
  const value = headValue(cursor)
  const rank = headRank(cursor)

  const prevThought = prevSibling(state, value, rootedContextOf(cursor), rank)

  // if the cursor is the first thought in the second column of a table, move the thought up to the end of its prev uncle
  const prevUncleThought = context.length > 0 && getThoughtBefore(state, context)
  const prevContext = prevUncleThought && contextOf(context).concat(prevUncleThought)

  if (!prevThought && !prevContext) return

  // metaprogramming functions that prevent moving
  const thoughtMeta = meta(state, pathToContext(cursor))
  const contextMeta = meta(state, pathToContext(contextOf(cursor)))
  const sortPreference = getSortPreference(state, contextMeta)

  if (sortPreference === 'Alphabetical') {
    dispatch(error(`Cannot move subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" while sort is enabled.`))
    return
  }
  else if (thoughtMeta.readonly) {
    dispatch(error(`"${ellipsize(headValue(cursor))}" is read-only and cannot be moved.`))
    return
  }
  else if (thoughtMeta.immovable) {
    dispatch(error(`"${ellipsize(headValue(cursor))}" is immovable.`))
    return
  }
  else if (contextMeta.readonly && contextMeta.readonly.Subthoughts) {
    dispatch(error(`Subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" are read-only and cannot be moved.`))
    return
  }
  else if (contextMeta.immovable && contextMeta.immovable.Subthoughts) {
    dispatch(error(`Subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" are immovable.`))
    return
  }

  // store selection offset before existingThoughtMove is dispatched
  const offset = window.getSelection().focusOffset

  const rankNew = prevThought
    // previous thought
    ? getRankBefore(state, context.concat(prevThought))
    // first thought in table column 2
    : getNextRank(state, prevContext)

  const newPath = (prevThought ? context : prevContext).concat({
    value,
    rank: rankNew
  })

  dispatch({
    type: 'existingThoughtMove',
    oldPath: cursor,
    newPath,
    offset,
  })
}
