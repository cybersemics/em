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
import {
  getPrevRank,
  getRankAfter,
  getSortPreference,
  getThoughtAfter,
  meta,
  nextSibling,
} from '../selectors'

// reducers
import existingThoughtMove from './existingThoughtMove'

/** Swaps the thought with its next siblings. */
export default state => {

  const { cursor } = state

  if (!cursor) return state

  const context = contextOf(cursor)
  const value = headValue(cursor)
  const rank = headRank(cursor)

  const nextThought = nextSibling(state, value, rootedContextOf(cursor), rank)

  // if the cursor is the last thought in the second column of a table, move the thought to the beginning of its next uncle
  const nextUncleThought = context.length > 0 && getThoughtAfter(state, context)
  const nextContext = nextUncleThought && contextOf(context).concat(nextUncleThought)

  if (!nextThought && !nextContext) return state

  // metaprogramming functions that prevent moving
  const thoughtMeta = meta(state, pathToContext(cursor))
  const contextMeta = meta(state, pathToContext(contextOf(cursor)))
  const sortPreference = getSortPreference(state, contextMeta)

  if (sortPreference === 'Alphabetical') {
    return error(state, {
      value: `Cannot move subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" while sort is enabled.`
    })
  }
  else if (thoughtMeta.readonly) {
    return error(state, {
      value: `"${ellipsize(headValue(cursor))}" is read-only and cannot be moved.`
    })
  }
  else if (thoughtMeta.immovable) {
    return error(state, {
      value: `"${ellipsize(headValue(cursor))}" is immovable.`
    })
  }
  else if (contextMeta.readonly && contextMeta.readonly.Subthoughts) {
    return error(state, {
      value: `Subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" are read-only and cannot be moved.`
    })
  }
  else if (contextMeta.immovable && contextMeta.immovable.Subthoughts) {
    return error(state, {
      value: `Subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" are immovable.`
    })
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

  return existingThoughtMove(state, {
    oldPath: cursor,
    newPath,
    offset,
  })
}
