import { State } from '../util/initialState'

/** A selector that returns true if there are any local or remote pushes queued or in-progress. Does not include state-only updates, i.e. from pull. */
const hasPushes = (state: State) =>
  state.isPushing ||
  state.pushQueue.some(batch => batch.local || batch.remote)

export default hasPushes
