import { clearQueue } from '../reducers'
import { expandThoughts } from '../selectors'
import { logWithTime, mergeUpdates } from '../util'
import { State } from '../util/initialState'
import { Child, Lexeme, ParentEntry } from '../types'
import { GenericObject } from '../utilTypes'

interface Payload {
  thoughtIndexUpdates: GenericObject<Lexeme | null>,
  contextIndexUpdates: GenericObject<ParentEntry | null>,
  recentlyEdited?: GenericObject<any>,
  contextChain?: Child[][],
  updates?: GenericObject<string>,
  local?: boolean,
  remote?: boolean,
}

/**
 * Updates thoughtIndex and contextIndex with any number of thoughts.
 * WARNING: When setting local or remote params to false, if more updates are pushed to the syncQueue before the next flushQueue, they will also not be persisted! There is not currently a way to control a single update to the sync queue.
 *
 * @param local    If false, does not persist next flushQueue to local database. Default: true.
 * @param remote   If false, does not persist next flushQueue to remote database. Default: true.
 */
const updateThoughts = (state: State, { thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, contextChain, updates, local = true, remote = true }: Payload) => {

  const thoughtIndex = mergeUpdates(state.thoughts.thoughtIndex, thoughtIndexUpdates)
  logWithTime('updateThoughts: merge thoughtIndexUpdates')

  const contextIndex = mergeUpdates(state.thoughts.contextIndex || {}, contextIndexUpdates)
  logWithTime('updateThoughts: merge contextIndexUpdates')

  const recentlyEditedNew = recentlyEdited || state.recentlyEdited
  const syncQueue = state.syncQueue || clearQueue(state).syncQueue

  // updates are queued, detected by the syncQueue middleware, and sync'd with the local and remote stores
  const syncQueueNew = {
    thoughtIndexUpdates: { ...syncQueue.thoughtIndexUpdates, ...thoughtIndexUpdates },
    contextIndexUpdates: { ...syncQueue.contextIndexUpdates, ...contextIndexUpdates },
    recentlyEdited, // only sync recentlyEdited if modified
    updates,
    local,
    remote
  }

  logWithTime('updateThoughts: merge syncQueue')

  const stateNew = {
    ...state,
    recentlyEdited: recentlyEditedNew,
    syncQueue: syncQueueNew,
    thoughts: {
      contextIndex,
      thoughtIndex,
    },
  }

  // use fresh state to calculate expanded
  const expanded = expandThoughts(stateNew, stateNew.cursor, contextChain)

  logWithTime('updateThoughts: expanded')

  return {
    ...stateNew,
    expanded,
  }
}

export default updateThoughts
