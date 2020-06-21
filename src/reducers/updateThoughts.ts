import { GenericObject } from '../utilTypes'
import { Lexeme, ParentEntry } from '../types'
import { State } from '../util/initialState'
import { decodeThoughtsUrl, expandThoughts } from '../selectors'
import { concatOne, isRoot, logWithTime, mergeUpdates, reducerFlow } from '../util'

interface Options {
  thoughtIndexUpdates: GenericObject<Lexeme>,
  contextIndexUpdates: GenericObject<ParentEntry>,
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

  return reducerFlow([

    // update recentlyEdited, syncQueue, and thoughts
    state => ({
      ...state,
      isLoading: false, // disable loading screen as soon as the first thoughts are loaded
      recentlyEdited: recentlyEditedNew,
      syncQueue: concatOne(state.syncQueue, batch),
      thoughts: {
        contextIndex,
        thoughtIndex,
      },
    }),

    // Decode cursor from url if null. This occurs when the page first loads. The thoughtCache can determine which contexts to load from the url, but cannot determine the full cursor (with ranks) until the thoughts have been loaded. To make it source agnostic, we decode the url here.
    !state.cursor
      ? state => {
        const { contextViews, thoughtsRanked } = decodeThoughtsUrl(state, window.location.pathname)
        const cursorNew = isRoot(thoughtsRanked) ? null : thoughtsRanked
        return {
          ...state,
          contextViews,
          cursorBeforeEdit: cursorNew,
          cursor: cursorNew,
        }
      }
      : null,

    // calculate expanded using fresh thoughts and cursor
    state => ({
      ...state,
      expanded: expandThoughts(state, state.cursor, contextChain),
    })

  ])(state)
}
