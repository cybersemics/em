import { store } from '../store'
import { error } from './error'

// util
import {
  contextOf,
  ellipsize,
  headRank,
  headValue,
  meta,
  nextSibling,
  pathToContext,
  rootedContextOf,
} from '../util'

// selectors
import { getPrevRank, getRankAfter, getSortPreference, getThoughtAfter } from '../selectors'

export const moveThoughtDown = () => dispatch => {

  const state = store.getState()
  const { cursor } = state

  if (!cursor) return

  const context = contextOf(cursor)
  const value = headValue(cursor)
  const rank = headRank(cursor)

  const nextThought = nextSibling(value, rootedContextOf(cursor), rank)

  // if the cursor is the last thought in the second column of a table, move the thought to the beginning of its next uncle
  const nextUncleThought = context.length > 0 && getThoughtAfter(state, context)
  const nextContext = nextUncleThought && contextOf(context).concat(nextUncleThought)

  if (!nextThought && !nextContext) return

  // metaprogramming functions that prevent moving
  const thoughtMeta = meta(pathToContext(cursor))
  const contextMeta = meta(pathToContext(contextOf(cursor)))
  const sortPreference = getSortPreference(state, contextMeta)

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

  const rankNew = nextThought
    // previous thought
    ? getRankAfter(state, context.concat(nextThought))
    // first thought in table column 2
    : getPrevRank(state, nextContext)

  const newPath = (nextThought ? context : nextContext).concat({
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
