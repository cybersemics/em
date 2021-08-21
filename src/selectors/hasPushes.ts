import { State } from '../@types'

/** A selector that returns true if there are any local or remote pushes queued or in-progress. Used by pullQueue to avoid pulling during a push. Does not include updates for Redux state only. */
const hasPushes = (state: State) => state.isPushing || state.pushQueue.some(batch => batch.local || batch.remote)

export default hasPushes
