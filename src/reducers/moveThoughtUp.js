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
  getNextRank,
  getRankBefore,
  getSortPreference,
  getThoughtBefore,
  meta,
  prevSibling,
} from '../selectors'

// reducers
import existingThoughtMove from './existingThoughtMove'

/** Swaps the thought with its previous siblings. */
export default state => {

  const { cursor } = state

  if (!cursor) return state

  const context = contextOf(cursor)
  const value = headValue(cursor)
  const rank = headRank(cursor)

  const prevThought = prevSibling(state, value, rootedContextOf(cursor), rank)

  // if the cursor is the first thought in the second column of a table, move the thought up to the end of its prev uncle
  const prevUncleThought = context.length > 0 && getThoughtBefore(state, context)
  const prevContext = prevUncleThought && contextOf(context).concat(prevUncleThought)

  if (!prevThought && !prevContext) return state

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

  const rankNew = prevThought
    // previous thought
    ? getRankBefore(state, context.concat(prevThought))
    // first thought in table column 2
    : getNextRank(state, prevContext)

  const newPath = (prevThought ? context : prevContext).concat({
    value,
    rank: rankNew
  })

  return existingThoughtMove(state, {
    oldPath: cursor,
    newPath,
    offset,
  })
}
