import { error, existingThoughtMove } from '../reducers'

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
  hasChild,
  prevSibling,
} from '../selectors'

/** Swaps the thought with its previous siblings. */
const moveThoughtUp = state => {

  const { cursor } = state

  if (!cursor) return state

  const thoughts = pathToContext(cursor)
  const pathParent = contextOf(cursor)
  const context = pathToContext(pathParent)
  const value = headValue(cursor)
  const rank = headRank(cursor)

  const prevThought = prevSibling(state, value, rootedContextOf(cursor), rank)

  // if the cursor is the first thought in the second column of a table, move the thought up to the end of its prev uncle
  const prevUncleThought = pathParent.length > 0 && getThoughtBefore(state, pathParent)
  const prevContext = prevUncleThought && contextOf(pathParent).concat(prevUncleThought)

  if (!prevThought && !prevContext) return state

  // metaprogramming functions that prevent moving
  if (getSortPreference(state, context) === 'Alphabetical') {
    return error(state, {
      value: `Cannot move subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" while sort is enabled.`
    })
  }
  else if (hasChild(state, thoughts, '=readonly')) {
    return error(state, {
      value: `"${ellipsize(headValue(cursor))}" is read-only and cannot be moved.`
    })
  }
  else if (hasChild(state, thoughts, '=immovable')) {
    return error(state, {
      value: `"${ellipsize(headValue(cursor))}" is immovable.`
    })
  }
  else if (hasChild(state, context, '=readonly')) {
    return error(state, {
      value: `Subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" are read-only and cannot be moved.`
    })
  }
  else if (hasChild(state, context, '=immovable')) {
    return error(state, {
      value: `Subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" are immovable.`
    })
  }

  // store selection offset before existingThoughtMove is dispatched
  const offset = window.getSelection().focusOffset

  const rankNew = prevThought
    // previous thought
    ? getRankBefore(state, pathParent.concat(prevThought))
    // first thought in table column 2
    : getNextRank(state, prevContext)

  const newPath = (prevThought ? pathParent : prevContext).concat({
    value,
    rank: rankNew
  })

  return existingThoughtMove(state, {
    oldPath: cursor,
    newPath,
    offset,
  })
}

export default moveThoughtUp
