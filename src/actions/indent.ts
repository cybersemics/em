import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import moveThought from '../actions/moveThought'
import * as selection from '../device/selection'
import findDescendant from '../selectors/findDescendant'
import { getChildrenRanked } from '../selectors/getChildren'
import getNextRank from '../selectors/getNextRank'
import isContextViewActive from '../selectors/isContextViewActive'
import prevSibling from '../selectors/prevSibling'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'

/** Increases the indentation level of the thought, i.e. Moves it to the end of its previous sibling. */
const indent = (state: State): State => {
  const { cursor } = state

  if (!cursor) return state

  const prev = prevSibling(state, cursor)

  if (!prev) return state

  // cancel if cursor is EM_TOKEN or HOME_TOKEN
  if (isEM(cursor) || isRoot(cursor)) {
    return alert(state, { value: `The "${isEM(cursor) ? 'em' : 'home'} context" may not be indented.` })
  }
  // cancel if parent is readonly or unextendable
  else if (findDescendant(state, head(parentOf(cursor)), '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, parentOf(cursor)) ?? 'MISSING_THOUGHT')}" is read-only so "${headValue(
        state,
        cursor,
      )}" may not be indented.`,
    })
  } else if (findDescendant(state, head(parentOf(cursor)), '=uneditable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, parentOf(cursor)) ?? 'MISSING_THOUGHT')}" is unextendable so "${headValue(
        state,
        cursor,
      )}" may not be indented.`,
    })
  } else if (isContextViewActive(state, parentOf(cursor))) {
    return alert(state, {
      value: `Contexts may not be indented in the context view.`,
    })
  }

  // calculate offset value based upon selection node before moveThought is dispatched
  const offset = (selection.isText() ? selection.offset() || 0 : state.cursorOffset) || 0

  const cursorNew = appendToPath(parentOf(cursor), prev.id, head(cursor))

  // For treecrdt: afterId must be a sibling (child of new parent), not the parent.
  // Tab indent should place as last child of prev, so use last child of prev; undefined if prev has no children.
  const prevChildren = getChildrenRanked(state, prev.id)
  const lastChildOfPrev = _.last(prevChildren)

  return moveThought(state, {
    oldPath: cursor,
    newPath: cursorNew,
    ...(offset != null ? { offset } : null),
    newRank: getNextRank(state, prev.id),
    afterId: lastChildOfPrev?.id ?? null,
  })
}

/** Action-creator for indent. */
export const indentActionCreator = (): Thunk => dispatch => dispatch({ type: 'indent' })

export default indent

// Register this action's metadata
registerActionMetadata('indent', {
  undoable: true,
})
