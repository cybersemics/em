import error from './error'
import { existingThoughtMove } from '../reducers'
import { State } from '../util/initialState'

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
  hasChild,
  nextSibling,
} from '../selectors'

/** Swaps the thought with its next siblings. */
const moveThoughtDown = (state: State) => {

  const { cursor } = state

  if (!cursor) return state

  const thoughts = pathToContext(cursor)
  const pathParent = contextOf(cursor)
  const context = pathToContext(pathParent)
  const value = headValue(cursor)
  const rank = headRank(cursor)

  const nextThought = nextSibling(state, value, rootedContextOf(pathToContext(cursor)), rank)

  // if the cursor is the last thought in the second column of a table, move the thought to the beginning of its next uncle
  const nextUncleThought = pathParent.length > 0 && getThoughtAfter(state, pathParent)
  const nextContext = nextUncleThought && contextOf(pathParent).concat(nextUncleThought)

  if (!nextThought && !nextContext) return state

  // metaprogramming functions that prevent moving
  const sortPreference = getSortPreference(state, context)

  if (sortPreference === 'Alphabetical') {
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
  const offset = window.getSelection()?.focusOffset

  const rankNew = nextThought
    // previous thought
    ? getRankAfter(state, pathParent.concat(nextThought))
    // first thought in table column 2
    : getPrevRank(state, nextContext as any)

  // @ts-ignore
  const newPath = (nextThought ? pathParent : nextContext).concat({
    value,
    rank: rankNew
  })

  return existingThoughtMove(state, {
    oldPath: cursor,
    newPath,
    offset,
  })
}

export default moveThoughtDown
