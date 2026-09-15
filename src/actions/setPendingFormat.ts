import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import getThoughtById from '../selectors/getThoughtById'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import updateThoughts from './updateThoughts'

export interface setPendingFormatPayload {
  path: Path
  /** The formatting to hold, or null to clear it. */
  value: string | null
}

/** Holds formatting that has been applied to an empty thought until text is typed into it. An empty thought's value must stay empty, so the formatting has nowhere to live in the value itself. */
const setPendingFormat = (state: State, { path, value }: setPendingFormatPayload): State => {
  const thought = getThoughtById(state, head(path))
  if (!thought || thought.pendingFormat === (value ?? undefined)) return state

  // Omit the key rather than setting it to undefined, which a JSON patch does not treat as a removal.
  const { pendingFormat: _pendingFormat, ...thoughtWithoutPendingFormat } = thought

  return updateThoughts(state, {
    thoughtIndexUpdates: {
      [thought.id]:
        value === null ? thoughtWithoutPendingFormat : { ...thoughtWithoutPendingFormat, pendingFormat: value },
    },
    lexemeIndexUpdates: {},
    // pendingFormat is not part of the persisted ThoughtPayload, so there is nothing to write or sync
    local: false,
    remote: false,
    // Holding formatting is not an edit, so lastUpdated does not advance. Without this the update looks like a stale
    // echo from another device and is discarded. Same reason generateEmoji sets it for `generating`.
    overwritePending: true,
  })
}

/** Action-creator for setPendingFormat. */
export const setPendingFormatActionCreator =
  (payload: setPendingFormatPayload): Thunk =>
  dispatch =>
    dispatch({ type: 'setPendingFormat', ...payload })

export default setPendingFormat

// Register this action's metadata
registerActionMetadata('setPendingFormat', {
  undoable: true,
  isNavigation: false,
})
