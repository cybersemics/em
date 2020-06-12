import { GenericObject } from '../utilTypes'
import { Lexeme, Parent } from '../types'
import { State } from '../util/initialState'
import { expandThoughts } from '../selectors'
import { concatOne, logWithTime, mergeUpdates } from '../util'

interface Options {
  thoughtIndexUpdates: GenericObject<Lexeme>,
  contextIndexUpdates: GenericObject<Parent>,
  recentlyEdited?: any,
  contextChain?: any,
  updates?: GenericObject<any>,
  local?: boolean,
  remote?: boolean,
}

/**
 * Updates thoughtIndex and contextIndex with any number of thoughts.
 *
 * @param local    If false, does not persist to local database. Default: true.
 * @param remote   If false, does not persist to remote database. Default: true.
 */
export default (state: State, { thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, contextChain, updates, local = true, remote = true }: Options) => {

  const thoughtIndex = mergeUpdates(state.thoughts.thoughtIndex, thoughtIndexUpdates)
  logWithTime('updateThoughts: merge thoughtIndexUpdates')

  const contextIndex = mergeUpdates(state.thoughts.contextIndex || {}, contextIndexUpdates)
  logWithTime('updateThoughts: merge contextIndexUpdates')

  const recentlyEditedNew = recentlyEdited || state.recentlyEdited

  // updates are queued, detected by the syncQueue middleware, and sync'd with the local and remote stores
  const batch = {
    thoughtIndexUpdates,
    contextIndexUpdates,
    recentlyEdited,
    updates,
    local,
    remote
  }

  logWithTime('updateThoughts: merge syncQueue')

  const stateNew = {
    ...state,
    isLoading: false, // disable loading screen as soon as the first thoughts are loaded
    recentlyEdited: recentlyEditedNew,
    syncQueue: concatOne(state.syncQueue, batch),
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
