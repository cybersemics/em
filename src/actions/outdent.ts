import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import moveThought from '../actions/moveThought'
import * as selection from '../device/selection'
import findDescendant from '../selectors/findDescendant'
import getRankAfter from '../selectors/getRankAfter'
import isContextViewActive from '../selectors/isContextViewActive'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'

export interface outdentPayload {
  /** The caret offset within the cursor thought, read from the document before the move. Null when the caret is not in the thought's text, in which case state.cursorOffset is used instead. */
  selectionOffset?: number | null
}

/** Decreases the indent level of the given thought, moving it to its parent. */
const outdent = (state: State, { selectionOffset }: outdentPayload = {}): State => {
  const { cursor } = state
  if (!cursor || cursor.length <= 1) return state

  // Cancel if a direct child of EM_TOKEN or HOME_TOKEN
  if (isEM(parentOf(cursor)) || isRoot(parentOf(cursor))) {
    return alert(state, {
      value: `Subthought of the "${isEM(parentOf(cursor)) ? 'em' : 'home'} context" may not be de-indented.`,
    })
  }
  // cancel if parent is readonly or unextendable
  else if (findDescendant(state, head(parentOf(cursor)), '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, parentOf(cursor)) ?? 'MISSING_THOUGHT')}" is read-only so "${headValue(
        state,
        cursor,
      )}" may not be de-indented.`,
    })
  } else if (findDescendant(state, head(parentOf(cursor)), '=unextendable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, parentOf(cursor)) ?? 'MISSING_THOUGHT')}" is unextendable so "${headValue(
        state,
        cursor,
      )}" may not be de-indented.`,
    })
  } else if (isContextViewActive(state, parentOf(cursor))) {
    return alert(state, {
      value: `Contexts may not be de-indented in the context view.`,
    })
  } else if (isContextViewActive(state, parentOf(parentOf(cursor)))) {
    return alert(state, {
      value: `Subthoughts may not be de-indented from their context in the context view.`,
    })
  }

  const offset = (selectionOffset ?? state.cursorOffset) || 0

  const cursorNew: Path = appendToPath(parentOf(parentOf(cursor)), head(cursor))

  const parentPath = parentOf(simplifyPath(state, cursor))
  return moveThought(state, {
    oldPath: cursor,
    newPath: cursorNew,
    ...(offset != null ? { offset } : null),
    newRank: getRankAfter(state, parentPath),
    afterId: head(parentPath),
  })
}

/**
 * Action-creator for outdent. Reads the caret offset from the document, which the reducer cannot do itself without
 * reaching outside of state. It must be read before the move, since moveThought re-renders the editable.
 */
export const outdentActionCreator = (): Thunk => (dispatch, getState) => {
  const { cursor } = getState()
  const selectionOffset =
    cursor && selection.isOnEditable(head(cursor)) && selection.isText() ? (selection.offset() ?? 0) : null
  dispatch({ type: 'outdent', selectionOffset })
}

export default outdent

// Register this action's metadata
registerActionMetadata('outdent', {
  undoable: true,
})
