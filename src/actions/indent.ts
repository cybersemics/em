import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import moveThought from '../actions/moveThought'
import * as selection from '../device/selection'
import contextThoughtId from '../selectors/contextThoughtId'
import findDescendant from '../selectors/findDescendant'
import { getChildrenRanked } from '../selectors/getChildren'
import getNextRank from '../selectors/getNextRank'
import prevSibling from '../selectors/prevSibling'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headId from '../util/headId'
import headValue from '../util/headValue'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import { isContextStep } from '../util/pathStep'

export interface indentPayload {
  /** The caret offset within the cursor thought, read from the document before the move. Null when the caret is not in the thought's text, in which case state.cursorOffset is used instead. */
  selectionOffset?: number | null
}

/** Increases the indentation level of the thought, i.e. Moves it to the end of its previous sibling. */
const indent = (state: State, { selectionOffset }: indentPayload = {}): State => {
  const { cursor } = state

  if (!cursor) return state

  const prev = prevSibling(state, cursor)

  if (!prev) return state

  // The metaprogramming attributes that govern the move belong to the thought the user sees at the parent, which in
  // the context view is the context rather than the Lexeme instance. Null when the cursor is a root child, which has no
  // parent thought to check.
  const parentId = cursor.length > 1 ? contextThoughtId(state, parentOf(cursor)) : null

  // cancel if cursor is EM_TOKEN or HOME_TOKEN
  if (isEM(cursor) || isRoot(cursor)) {
    return alert(state, { value: `The "${isEM(cursor) ? 'em' : 'home'} context" may not be indented.` })
  }
  // cancel if parent is readonly or unextendable
  else if (findDescendant(state, parentId, '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, parentOf(cursor)) ?? 'MISSING_THOUGHT')}" is read-only so "${headValue(
        state,
        cursor,
      )}" may not be indented.`,
    })
  } else if (findDescendant(state, parentId, '=uneditable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, parentOf(cursor)) ?? 'MISSING_THOUGHT')}" is unextendable so "${headValue(
        state,
        cursor,
      )}" may not be indented.`,
    })
  } else if (isContextStep(head(cursor))) {
    return alert(state, {
      value: `Contexts may not be indented in the context view.`,
    })
  }

  const offset = (selectionOffset ?? state.cursorOffset) || 0

  const cursorNew = appendToPath(parentOf(cursor), prev.id, headId(cursor))

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

/**
 * Action-creator for indent. Reads the caret offset from the document, which the reducer cannot do itself without
 * reaching outside of state. It must be read before the move, since moveThought re-renders the editable.
 */
export const indentActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state
  const selectionOffset =
    cursor && selection.isOnEditable(contextThoughtId(state, cursor)) && selection.isText()
      ? (selection.offset() ?? 0)
      : null
  dispatch({ type: 'indent', selectionOffset })
}

export default indent

// Register this action's metadata
registerActionMetadata('indent', {
  undoable: true,
})
