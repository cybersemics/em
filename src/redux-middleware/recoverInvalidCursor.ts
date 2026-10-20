import { ThunkMiddleware } from 'redux-thunk'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { pullAncestorsActionCreator as pullAncestors } from '../actions/pullAncestors'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, ROOT_PARENT_ID } from '../constants'
import getThoughtById from '../selectors/getThoughtById'
import isValidPath from '../selectors/isValidPath'
import thoughtToPath from '../selectors/thoughtToPath'
import debugLog from '../util/debugLog'
import head from '../util/head'

/** The contexts a parent chain ends at. They are always in the thought index or, for the global root, never are. */
const rootContexts = new Set<ThoughtId>([ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, ROOT_PARENT_ID])

/** Returns the first ancestor of a thought that is not loaded, or null if its whole parent chain is loaded. */
const unloadedAncestor = (state: State, id: ThoughtId): ThoughtId | null => {
  const visited = new Set<ThoughtId>()
  let thought = getThoughtById(state, id)
  while (thought && !rootContexts.has(thought.parentId) && !visited.has(thought.id)) {
    visited.add(thought.id)
    const parent = getThoughtById(state, thought.parentId)
    if (!parent) return thought.parentId
    thought = parent
  }
  return null
}

/** A middleware that recovers from a cursor that no longer leads to its thought (see isValidPath). Such a cursor names ancestors that no longer contain it, so nothing below the first missing ancestor renders and the thoughtspace appears empty. It is a bug wherever it comes from, but a cursor is set by many reducers directly and can also be stranded by a move synced from another device, so it is caught here after every action rather than in setCursor. The cursor is moved back to the last valid cursor, i.e. the one before the action, or if that was invalidated too, to the thought's current location, or else cleared. While the thought's current location is not loaded, the cursor is kept and the missing ancestors are pulled instead: the thought may only appear moved because a stale copy loaded first, and once the rest loads the cursor is either valid again or can be moved to where the thought really is. */
const recoverInvalidCursor: ThunkMiddleware<State> = ({ getState, dispatch }) => {
  // the ancestor already being pulled, so that every thoughtIndex change while it loads does not pull it again
  let pulling: ThoughtId | null = null

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

    // The thought's current location is not loaded yet, so keep the cursor until it is rather than clear it.
    const missing = recovered ? null : unloadedAncestor(state, head(cursor))
    if (missing) {
      if (missing !== pulling) {
        pulling = missing
        dispatch(pullAncestors([missing], { maxDepth: 0 })).finally(() => {
          if (pulling === missing) pulling = null
        })
      }
      return
    }

    debugLog.log('integrity', { issue: 'invalidCursor', cursor, recovered })
    console.error('Invalid cursor recovered. A thought on the cursor was moved without the cursor being rebased.', {
      cursor,
      recovered,
    })

    dispatch(setCursor({ path: recovered }))
  }
}

export default recoverInvalidCursor
