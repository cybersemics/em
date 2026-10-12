import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import moveThought from '../actions/moveThought'
import * as selection from '../device/selection'
import findDescendant from '../selectors/findDescendant'
import getFirstChildPlacement from '../selectors/getFirstChildPlacement'
import nextSibling from '../selectors/nextSibling'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import command from '../util/command'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'

export interface moveThoughtDownPayload {
  /** The caret offset within the cursor thought, read from the document before the move. */
  offset?: number | null
}

/** Swaps the thought with its next siblings. */
const moveThoughtDown = (
  state: State,
  { offset }: moveThoughtDownPayload = {},
  transaction?: ThoughtspaceTransaction,
): State => {
  const { cursor } = state

  if (!cursor) return state

  const thoughtId = head(cursor)
  const pathParent = parentOf(cursor)
  const parentId = head(pathParent)
  const nextThought = nextSibling(state, cursor)

  // if the cursor is the last child, move the thought to the beginning of its next uncle
  const nextUncleThought = pathParent.length > 0 ? nextSibling(state, pathParent) : null
  const nextUnclePath = nextUncleThought ? appendToPath(parentOf(pathParent), nextUncleThought.id) : null

  if (!nextThought && !nextUnclePath) return state

  if (findDescendant(state, thoughtId, '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursor) ?? 'MISSING_THOUGHT')}" is read-only and cannot be moved.`,
    })
  } else if (findDescendant(state, thoughtId, '=immovable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, cursor) ?? 'MISSING_THOUGHT')}" is immovable.`,
    })
  } else if (findDescendant(state, parentId, '=readonly')) {
    return alert(state, {
      value: `Subthoughts of "${ellipsize(headValue(state, parentOf(cursor)) ?? 'MISSING_THOUGHT')}" are read-only and cannot be moved.`,
    })
  } else if (findDescendant(state, parentId, '=immovable')) {
    return alert(state, {
      value: `Subthoughts of "${ellipsize(headValue(state, parentOf(cursor)) ?? 'MISSING_THOUGHT')}" are immovable.`,
    })
  }

  const newPathParent = nextThought ? pathParent : nextUnclePath!
  const newPath = appendToPath(newPathParent, head(cursor))

  return moveThought(
    state,
    {
      oldPath: cursor,
      newPath,
      ...(offset != null ? { offset } : null),
      afterId: nextThought ? nextThought.id : getFirstChildPlacement(state, head(nextUnclePath!)),
    },
    transaction,
  )
}

/**
 * Action-creator for moveThoughtDown. Reads the caret offset from the document, which the reducer cannot do itself without
 * reaching outside of state. It must be read before the move, since moveThought re-renders the editable.
 */
export const moveThoughtDownActionCreator = (): Thunk => dispatch =>
  dispatch({ type: 'moveThoughtDown', offset: selection.offset() })

export default command(moveThoughtDown)

// Register this action's metadata
registerActionMetadata('moveThoughtDown', {
  undoable: true,
})
