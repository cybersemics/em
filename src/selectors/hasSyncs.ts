import { State } from '../util/initialState'

/** A selector that returns true if there are any local or remote syncs queued or in-progress. Does not include state-only updates, i.e. from thoughtCache or reconcile. */
const hasSyncs = (state: State) =>
  state.isSyncing ||
  state.pushQueue.some((batch: any) => batch.local || batch.remote)

export default hasSyncs
