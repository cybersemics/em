import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import moveThought from '../actions/moveThought'
import * as selection from '../device/selection'
import findDescendant from '../selectors/findDescendant'
import { getChildrenRanked } from '../selectors/getChildren'
import isContextViewActive from '../selectors/isContextViewActive'
import prevSibling from '../selectors/prevSibling'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import command from '../util/command'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'

export interface indentPayload {
  /** The caret offset within the cursor thought, read from the document before the move. Null when the caret is not in the thought's text, in which case state.cursorOffset is used instead. */
  selectionOffset?: number | null
}

/** Increases the indentation level of the thought, i.e. Moves it to the end of its previous sibling. */
const indent = (state: State, { selectionOffset }: indentPayload = {}, document?: ThoughtspaceTransaction): State => {
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

  const offset = (selectionOffset ?? state.cursorOffset) || 0

  const cursorNew = appendToPath(parentOf(cursor), prev.id, head(cursor))

  return moveThought(
    state,
    {
      oldPath: cursor,
      newPath: cursorNew,
      ...(offset != null ? { offset } : null),
      afterId: getChildrenRanked(state, prev.id).at(-1)?.id ?? null,
    },
    document,
  )
}

/**
 * Action-creator for indent. Reads the caret offset from the document, which the reducer cannot do itself without
 * reaching outside of state. It must be read before the move, since moveThought re-renders the editable.
 */
export const indentActionCreator = (): Thunk => (dispatch, getState) => {
  const { cursor } = getState()
  const selectionOffset =
    cursor && selection.isOnEditable(head(cursor)) && selection.isText() ? (selection.offset() ?? 0) : null
  dispatch({ type: 'indent', selectionOffset })
}

export default command(indent)

// Register this action's metadata
registerActionMetadata('indent', {
  undoable: true,
})
