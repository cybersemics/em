import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import * as selection from '../device/selection'
import alert from '../reducers/alert'
import moveThought from '../reducers/moveThought'
import findDescendant from '../selectors/findDescendant'
import getPrevRank from '../selectors/getPrevRank'
import getRankAfter from '../selectors/getRankAfter'
import getSortPreference from '../selectors/getSortPreference'
import getThoughtAfter from '../selectors/getThoughtAfter'
import getThoughtById from '../selectors/getThoughtById'
import nextSibling from '../selectors/nextSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'

/** Swaps the thought with its next siblings. */
const moveThoughtDown = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const thoughtId = head(cursor)
  const pathParent = parentOf(cursor)
  const parentId = head(pathParent)
  const cursorThought = getThoughtById(state, head(cursor))
  const { value, rank } = cursorThought

  const nextThought = nextSibling(state, head(rootedParentOf(state, cursor)), value, rank)

  // if the cursor is the last child or the context is sorted, move the thought to the beginning of its next uncle
  const nextUncleThought = pathParent.length > 0 ? getThoughtAfter(state, simplifyPath(state, pathParent)) : null
  const nextUnclePath = nextUncleThought ? appendToPath(parentOf(pathParent), nextUncleThought.id) : null

  if (!nextThought && !nextUnclePath) return state

  // get sorted state
  const isSorted = getSortPreference(state, parentId).type !== 'None'

  if (isSorted && !nextUnclePath) {
    return alert(state, {
      value: `Cannot move subthoughts of "${ellipsize(headValue(state, parentOf(cursor)))}" while sort is enabled.`,
    })
  } else if (findDescendant(state, thoughtId, '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursor))}" is read-only and cannot be moved.`,
    })
  } else if (findDescendant(state, thoughtId, '=immovable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursor))}" is immovable.`,
    })
  } else if (findDescendant(state, parentId, '=readonly')) {
    return alert(state, {
      value: `Subthoughts of "${ellipsize(headValue(state, parentOf(cursor)))}" are read-only and cannot be moved.`,
    })
  } else if (findDescendant(state, parentId, '=immovable')) {
    return alert(state, {
      value: `Subthoughts of "${ellipsize(headValue(state, parentOf(cursor)))}" are immovable.`,
    })
  }

  // store selection offset before moveThought is dispatched
  const offset = selection.offset()

  const rankNew =
    nextThought && !isSorted
      ? // next thought (unsorted)
        getRankAfter(state, simplifyPath(state, pathParent).concat(nextThought.id) as SimplePath)
      : // first thought in next uncle
        getPrevRank(state, head(nextUnclePath!))

  const newPathParent = nextThought && !isSorted ? pathParent : nextUnclePath!
  const newPath = appendToPath(newPathParent, head(cursor))

  return moveThought(state, {
    oldPath: cursor,
    newPath,
    ...(offset != null ? { offset } : null),
    newRank: rankNew,
  })
}

export default moveThoughtDown
