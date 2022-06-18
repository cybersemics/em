import alert from '../reducers/alert'
import moveThought from '../reducers/moveThought'
import getNextRank from '../selectors/getNextRank'
import findDescendant from '../selectors/findDescendant'
import rootedParentOf from '../selectors/rootedParentOf'
import prevSibling from '../selectors/prevSibling'
import getThoughtById from '../selectors/getThoughtById'
import State from '../@types/State'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import * as selection from '../device/selection'

/** Increases the indentation level of the thought, i.e. Moves it to the end of its previous sibling. */
const indent = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const headCursorThought = getThoughtById(state, head(cursor))

  const { value, rank } = headCursorThought
  const prev = prevSibling(state, value, rootedParentOf(state, cursor), rank)

  if (!prev) return state

  // cancel if cursor is EM_TOKEN or HOME_TOKEN
  if (isEM(cursor) || isRoot(cursor)) {
    return alert(state, { value: `The "${isEM(cursor) ? 'em' : 'home'} context" may not be indented.` })
  }
  // cancel if parent is readonly or unextendable
  else if (findDescendant(state, head(parentOf(cursor)), '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, parentOf(cursor)))}" is read-only so "${headValue(
        state,
        cursor,
      )}" may not be indented.`,
    })
  } else if (findDescendant(state, head(parentOf(cursor)), '=uneditable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, parentOf(cursor)))}" is unextendable so "${headValue(
        state,
        cursor,
      )}" may not be indented.`,
    })
  }

  // calculate offset value based upon selection node before moveThought is dispatched
  const offset = (selection.isText() ? selection.offset() || 0 : state.cursorOffset) || 0

  const cursorNew = appendToPath(parentOf(cursor), prev.id, head(cursor))

  return moveThought(state, {
    oldPath: cursor,
    newPath: cursorNew,
    ...(offset != null ? { offset } : null),
    newRank: getNextRank(state, prev.id),
  })
}

export default indent
