import { alert, moveThought } from '../reducers'
import { SimplePath, State } from '../@types'
import { appendToPath, parentOf, ellipsize, head, headValue, pathToContext } from '../util'
import {
  getNextRank,
  getRankBefore,
  getThoughtBefore,
  hasChild,
  rootedParentOf,
  prevSibling,
  simplifyPath,
  getSortPreference,
  getThoughtById,
} from '../selectors'

/** Swaps the thought with its previous siblings. */
const moveThoughtUp = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const thoughts = pathToContext(state, cursor)
  const pathParent = parentOf(cursor)
  const context = pathToContext(state, pathParent)

  const cursorThought = getThoughtById(state, head(cursor))
  const { value, rank } = cursorThought

  const prevThought = prevSibling(state, value, rootedParentOf(state, pathToContext(state, cursor)), rank)

  // if the cursor is the first thought or the context is sorted, move the thought to the end of its prev uncle
  const prevUncleThought = pathParent.length > 0 ? getThoughtBefore(state, simplifyPath(state, pathParent)) : null
  const prevUnclePath = prevUncleThought ? appendToPath(parentOf(pathParent), prevUncleThought.id) : null

  if (!prevThought && !prevUnclePath) return state

  // get sorted state
  const isSorted = getSortPreference(state, context).type !== 'None'

  // metaprogramming functions that prevent moving
  if (isSorted && !prevUnclePath) {
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

  // get selection offset before moveThought is dispatched
  const offset = window.getSelection()?.focusOffset

  const rankNew =
    prevThought && !isSorted
      ? // previous thought (unsorted)
        getRankBefore(state, simplifyPath(state, pathParent).concat(prevThought.id) as SimplePath)
      : // first thought in previous uncle
        getNextRank(state, pathToContext(state, prevUnclePath!))

  const newPathParent = prevThought && !isSorted ? pathParent : prevUnclePath!
  const newPath = appendToPath(newPathParent, head(cursor))

  return moveThought(state, {
    oldPath: cursor,
    newPath,
    offset,
    newRank: rankNew,
  })
}

export default moveThoughtUp
