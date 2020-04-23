import { store } from '../store'
import { error } from './error'

// util
import {
  contextOf,
  ellipsize,
  getNextRank,
  getRankBefore,
  getSortPreference,
  getThoughtBefore,
  headRank,
  headValue,
  meta,
  pathToContext,
  prevSibling,
  rootedContextOf,
} from '../util'

export const moveThoughtUp = () => dispatch => {
  const { cursor } = store.getState()

  if (!cursor) return

  const context = contextOf(cursor)
  const value = headValue(cursor)
  const rank = headRank(cursor)

  const prevThought = prevSibling(value, rootedContextOf(cursor), rank)

  // if the cursor is the first thought in the second column of a table, move the thought up to the end of its prev uncle
  const prevUncleThought = context.length > 0 && getThoughtBefore(context)
  const prevContext = prevUncleThought && contextOf(context).concat(prevUncleThought)

  if (!prevThought && !prevContext) return

  // metaprogramming functions that prevent moving
  const thoughtMeta = meta(pathToContext(cursor))
  const contextMeta = meta(pathToContext(contextOf(cursor)))
  const sortPreference = getSortPreference(contextMeta)

  if (sortPreference === 'Alphabetical') {
    error(`Cannot move subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" while sort is enabled.`)
    return
  }
  else if (thoughtMeta.readonly) {
    error(`"${ellipsize(headValue(cursor))}" is read-only and cannot be moved.`)
    return
  }
  else if (thoughtMeta.immovable) {
    error(`"${ellipsize(headValue(cursor))}" is immovable.`)
    return
  }
  else if (contextMeta.readonly && contextMeta.readonly.Subthoughts) {
    error(`Subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" are read-only and cannot be moved.`)
    return
  }
  else if (contextMeta.immovable && contextMeta.immovable.Subthoughts) {
    error(`Subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" are immovable.`)
    return
  }

  // store selection offset before existingThoughtMove is dispatched
  const offset = window.getSelection().focusOffset

  const rankNew = prevThought
    // previous thought
    ? getRankBefore(context.concat(prevThought))
    // first thought in table column 2
    : getNextRank(prevContext)

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
