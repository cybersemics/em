import { alert, existingThoughtMove } from '../reducers'
import { State } from '../util/initialState'
import { SimplePath } from '../types'
import { parentOf, ellipsize, head, headRank, headValue, pathToContext } from '../util'
import { getPrevRank, getRankAfter, getSortPreference, getThoughtAfter, hasChild, nextSibling, rootedParentOf, simplifyPath } from '../selectors'

/** Swaps the thought with its next siblings. */
const moveThoughtDown = (state: State) => {

  const { cursor } = state

  if (!cursor) return state

  const thoughts = pathToContext(cursor)
  const pathParent = parentOf(cursor)
  const context = pathToContext(pathParent)
  const value = headValue(cursor)
  const rank = headRank(cursor)

  const nextThought = nextSibling(state, value, rootedParentOf(state, pathToContext(cursor)), rank)

  // if the cursor is the last child or the context is sorted, move the thought to the beginning of its next uncle
  const nextUncleThought = pathParent.length > 0 ? getThoughtAfter(state, simplifyPath(state, pathParent)) : null
  const nextUnclePath = nextUncleThought ? parentOf(pathParent).concat(nextUncleThought) : null

  if (!nextThought && !nextUnclePath) return state

  // get sorted state
  const isSorted = getSortPreference(state, context) === 'Alphabetical'

  if (isSorted && !nextUnclePath) {
    return alert(state, {
      value: `Cannot move subthoughts of "${ellipsize(headValue(parentOf(cursor)))}" while sort is enabled.`
    })
  }
  else if (hasChild(state, thoughts, '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(cursor))}" is read-only and cannot be moved.`
    })
  }
  else if (hasChild(state, thoughts, '=immovable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(cursor))}" is immovable.`
    })
  }
  else if (hasChild(state, context, '=readonly')) {
    return alert(state, {
      value: `Subthoughts of "${ellipsize(headValue(parentOf(cursor)))}" are read-only and cannot be moved.`
    })
  }
  else if (hasChild(state, context, '=immovable')) {
    return alert(state, {
      value: `Subthoughts of "${ellipsize(headValue(parentOf(cursor)))}" are immovable.`
    })
  }

  // store selection offset before existingThoughtMove is dispatched
  const offset = window.getSelection()?.focusOffset

  const rankNew = nextThought && !isSorted
    // next thought (unsorted)
    ? getRankAfter(state, simplifyPath(state, pathParent).concat(nextThought) as SimplePath)
    // first thought in next uncle
    : getPrevRank(state, pathToContext(nextUnclePath!))

  const newPathParent = nextThought && !isSorted ? pathParent : nextUnclePath!
  const newPath = [
    ...newPathParent,
    {
      ...head(cursor),
      rank: rankNew,
    }
  ]

  return existingThoughtMove(state, {
    oldPath: cursor,
    newPath,
    offset,
  })
}

export default moveThoughtDown
