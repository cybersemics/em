import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import * as selection from '../device/selection'
import alert from '../reducers/alert'
import moveThought from '../reducers/moveThought'
import findDescendant from '../selectors/findDescendant'
import getNextRank from '../selectors/getNextRank'
import getRankBefore from '../selectors/getRankBefore'
import getSortPreference from '../selectors/getSortPreference'
import getThoughtBefore from '../selectors/getThoughtBefore'
import prevSibling from '../selectors/prevSibling'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import deleteAttribute from './deleteAttribute'

/** Swaps the thought with its previous siblings. */
const moveThoughtUp = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const thoughtId = head(cursor)
  const pathParent = parentOf(cursor)
  const parentId = head(pathParent)

  const prevThought = prevSibling(state, cursor)

  // if the cursor is the first thought or the context is sorted, move the thought to the end of its prev uncle
  const prevUncleThought = pathParent.length > 0 ? getThoughtBefore(state, simplifyPath(state, pathParent)) : null
  const prevUnclePath = prevUncleThought ? appendToPath(parentOf(pathParent), prevUncleThought.id) : null

  if (!prevThought && !prevUnclePath) return state

  // get sorted state
  const isSorted = getSortPreference(state, parentId).type !== 'None'

  // metaprogramming functions that prevent moving
  if (findDescendant(state, thoughtId, '=readonly')) {
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

  // get selection offset before moveThought is dispatched
  const offset = selection.offset()

  const rankNew = prevThought
    ? // previous thought (unsorted)
      getRankBefore(state, simplifyPath(state, pathParent).concat(prevThought.id) as SimplePath)
    : // first thought in previous uncle
      getNextRank(state, head(prevUnclePath!))

  const newPathParent = prevThought ? pathParent : prevUnclePath!
  const newPath = appendToPath(newPathParent, head(cursor))

  return reducerFlow([
    // remove sorting if moving within the same context
    isSorted && prevThought
      ? reducerFlow([
          alert({
            value: 'Switched to manual sort because thought was moved',
          }),
          deleteAttribute({
            path: pathParent,
            value: '=sort',
          }),
        ])
      : null,

    // move
    state =>
      moveThought(state, {
        oldPath: cursor,
        newPath,
        ...(offset != null ? { offset } : null),
        newRank: rankNew,
      }),
  ])(state)
}

export default moveThoughtUp
