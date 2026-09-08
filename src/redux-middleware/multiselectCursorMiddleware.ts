import { ThunkMiddleware } from 'redux-thunk'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { isTouch } from '../browser'
import getThoughtById from '../selectors/getThoughtById'
import equalPath from '../util/equalPath'
import head from '../util/head'
import parentOf from '../util/parentOf'

/** The cursor that was displaced when the multiselection grew past one thought, and the path it was parked at, or null if the cursor is not parked. Module state rather than Redux state, since this middleware is its only consumer and a park never outlives the multiselection that started it. */
let parked: { cursor: Path; parkedAt: Path | null } | null = null

/** Returns the nearest common ancestor of the given thoughts, i.e. the longest path that is a strict ancestor of every one of them. Null for the root, which is how setCursor represents it. */
const commonAncestor = (paths: Path[]): Path | null => {
  const ancestor = (paths.map(parentOf) as ThoughtId[][]).reduce((a, b) => {
    const divergence = a.findIndex((id, i) => id !== b[i])
    return divergence === -1 ? a : a.slice(0, divergence)
  })
  return ancestor.length > 0 ? (ancestor as Path) : null
}

/** A middleware that parks the cursor at the selected thoughts' nearest common ancestor while more than one thought is selected, and restores it when the selection ends. Otherwise the cursor stays on whichever thought it was on, dimming every other selected thought and expanding its own children, so that selected thoughts render differently from one another (#3557). Parking is done here rather than in the multicursor reducers so that it happens regardless of which action the multiselect is triggered from, and so that a reducer that replaces the whole selection within a single action (e.g. cursorBack) is seen only in its settled state. */
const multiselectCursorMiddleware: ThunkMiddleware<State> = ({ getState, dispatch }) => {
  return next => action => {
    next(action)

    // Only park on touch. On desktop the multiselection is extended from the cursor with Shift+ArrowUp/ArrowDown (see
    // cursorUp/cursorDown), so the cursor is load-bearing there and cannot be moved out of the selection.
    if (!isTouch) return

    const state = getState()

    // Do not react while a multicursor command is executing. The command loop sets the cursor to each selected thought
    // in turn and empties and restores the multicursors as it goes, so neither the cursor nor the count reflects the
    // user's selection until it completes. See executeCommandWithMulticursor.
    if (state.isMulticursorExecuting) return

    const paths = Object.values(state.multicursors)

    if (paths.length > 1) {
      const ancestor = commonAncestor(paths)
      // Take the cursor only when there is one to restore. With no cursor nothing is dimmed in the first place, so
      // parking would move the view for nothing.
      if (!parked) {
        if (state.cursor && !equalPath(state.cursor, ancestor)) {
          parked = { cursor: state.cursor, parkedAt: ancestor }
          dispatch(setCursor({ path: ancestor, preserveMulticursor: true }))
        }
      }
      // Re-park when the selection grows into another subtree or is replaced wholesale (cursorBack/cursorForward), so
      // that the cursor is an ancestor of every selected thought. Only while the cursor is still where it was parked;
      // if something else moved it (Clear Thought sets it to the first selected thought) it is no longer ours to move.
      else if (equalPath(state.cursor, parked.parkedAt) && !equalPath(state.cursor, ancestor)) {
        parked = { ...parked, parkedAt: ancestor }
        dispatch(setCursor({ path: ancestor, preserveMulticursor: true }))
      }
    }
    // Restore the displaced cursor when the selection ends, e.g. when the Command Center is closed. A selection of one
    // thought is not restored, since the multiselect is still active and the user may extend it again.
    else if (paths.length === 0 && parked) {
      const { cursor, parkedAt } = parked
      parked = null
      // Only restore the cursor if it is still parked. If the multiselection was ended by something that moved the
      // cursor itself — a command that deletes the selected thoughts, or the blur that ends multi edit mode — that
      // cursor is the user's and must not be yanked back.
      if (equalPath(state.cursor, parkedAt) && getThoughtById(state, head(cursor))) {
        dispatch(setCursor({ path: cursor }))
      }
    }
  }
}

export default multiselectCursorMiddleware
