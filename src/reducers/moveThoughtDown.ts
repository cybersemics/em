import { alert, moveThought } from '../reducers'
import { SimplePath, State } from '../@types'
import { appendToPath, parentOf, ellipsize, head, headValue, pathToContext } from '../util'
import {
  getPrevRank,
  getRankAfter,
  getSortPreference,
  getThoughtAfter,
  getThoughtById,
  hasChild,
  nextSibling,
  rootedParentOf,
  simplifyPath,
} from '../selectors'

/** Swaps the thought with its next siblings. */
const moveThoughtDown = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const thoughts = pathToContext(state, cursor)
  const pathParent = parentOf(cursor)
  const context = pathToContext(state, pathParent)
  const cursorThought = getThoughtById(state, head(cursor))
  const { value, rank } = cursorThought

  const nextThought = nextSibling(state, value, rootedParentOf(state, pathToContext(state, cursor)), rank)

  // if the cursor is the last child or the context is sorted, move the thought to the beginning of its next uncle
  const nextUncleThought = pathParent.length > 0 ? getThoughtAfter(state, simplifyPath(state, pathParent)) : null
  const nextUnclePath = nextUncleThought ? appendToPath(parentOf(pathParent), nextUncleThought.id) : null

  if (!nextThought && !nextUnclePath) return state

  // get sorted state
  const isSorted = getSortPreference(state, context).type !== 'None'

  if (isSorted && !nextUnclePath) {
    return alert(state, {
      value: `Cannot move subthoughts of "${ellipsize(headValue(state, parentOf(cursor)))}" while sort is enabled.`,
    })
  } else if (hasChild(state, thoughts, '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursor))}" is read-only and cannot be moved.`,
    })
  } else if (hasChild(state, thoughts, '=immovable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursor))}" is immovable.`,
    })
  } else if (hasChild(state, context, '=readonly')) {
    return alert(state, {
      value: `Subthoughts of "${ellipsize(headValue(state, parentOf(cursor)))}" are read-only and cannot be moved.`,
    })
  } else if (hasChild(state, context, '=immovable')) {
    return alert(state, {
      value: `Subthoughts of "${ellipsize(headValue(state, parentOf(cursor)))}" are immovable.`,
    })
  }

  // store selection offset before moveThought is dispatched
  const offset = window.getSelection()?.focusOffset

  const rankNew =
    nextThought && !isSorted
      ? // next thought (unsorted)
        getRankAfter(state, simplifyPath(state, pathParent).concat(nextThought.id) as SimplePath)
      : // first thought in next uncle
        getPrevRank(state, pathToContext(state, nextUnclePath!))

  const newPathParent = nextThought && !isSorted ? pathParent : nextUnclePath!
  const newPath = appendToPath(newPathParent, head(cursor))

  return moveThought(state, {
    oldPath: cursor,
    newPath,
    offset,
    newRank: rankNew,
  })
}

export default moveThoughtDown
