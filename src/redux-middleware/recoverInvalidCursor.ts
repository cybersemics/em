import { ThunkMiddleware } from 'redux-thunk'
import Path from '../@types/Path'
import State from '../@types/State'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { HOME_TOKEN } from '../constants'
import isValidPath from '../selectors/isValidPath'
import thoughtToPath from '../selectors/thoughtToPath'
import debugLog from '../util/debugLog'
import head from '../util/head'

/** A middleware that recovers from a cursor that no longer leads to its thought (see isValidPath). Such a cursor names ancestors that no longer contain it, so nothing below the first missing ancestor renders and the thoughtspace appears empty. It is a bug wherever it comes from, but a cursor is set by many reducers directly and can also be stranded by a move synced from another device, so it is caught here after every action rather than in setCursor. The cursor is moved back to the last valid cursor, i.e. the one before the action, or if that was invalidated too, to the thought's current location, or else cleared. */
const recoverInvalidCursor: ThunkMiddleware<State> = ({ getState, dispatch }) => {
  return next => action => {
    const stateBefore = getState()

    next(action)

    const state = getState()
    const { cursor } = state

    // A cursor can only become invalid when it changes or a thought moves.
    if (
      !cursor ||
      (cursor === stateBefore.cursor && state.thoughts.thoughtIndex === stateBefore.thoughts.thoughtIndex) ||
      isValidPath(state, cursor)
    )
      return

    // thoughtToPath starts the path at the home context when an ancestor is not loaded, which is not a cursor.
    const recovered: Path | null =
      [stateBefore.cursor, thoughtToPath(state, head(cursor))].find(
        (path): path is Path => !!path && path[0] !== HOME_TOKEN && isValidPath(state, path),
      ) ?? null

    debugLog.log('integrity', { issue: 'invalidCursor', cursor, recovered })
    console.error('Invalid cursor recovered. A thought on the cursor was moved without the cursor being rebased.', {
      cursor,
      recovered,
    })

    dispatch(setCursor({ path: recovered }))
  }
}

export default recoverInvalidCursor
