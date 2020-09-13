import _ from 'lodash'
import { Lexeme, ParentEntry } from '../types'
import { GenericObject } from '../utilTypes'
import { State, initialState } from '../util/initialState'
import { decodeThoughtsUrl, expandThoughts } from '../selectors'
import { importHtml, isRoot, logWithTime, mergeUpdates, reducerFlow } from '../util'
import { CONTEXT_CACHE_SIZE, EM_TOKEN, INITIAL_SETTINGS, THOUGHT_CACHE_SIZE } from '../constants'

interface Options {
  thoughtIndexUpdates: GenericObject<Lexeme>,
  contextIndexUpdates: GenericObject<ParentEntry>,
  recentlyEdited?: any,
  contextChain?: any,
  updates?: GenericObject<any>,
  local?: boolean,
  remote?: boolean,
}

// we should not delete ROOT, EM, or EM descendants from state
// whitelist them until we have a better solution
// eslint-disable-next-line fp/no-let
let whitelistedThoughts: {
  contextIndex: GenericObject<ParentEntry>,
  thoughtIndex: GenericObject<Lexeme>,
}

// delay so util is fully loaded, otherwise importHtml will error out with "pathToContext is not a function"
setTimeout(() => {

  const state = initialState()

  const {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
  } = importHtml(state, [{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS)

  whitelistedThoughts = {
    contextIndex: {
      ...state.thoughts.contextIndex,
      ...contextIndex,
    },
    thoughtIndex: {
      ...state.thoughts.thoughtIndex,
      ...thoughtIndex,
    },
  }

})

/**
 * Updates thoughtIndex and contextIndex with any number of thoughts.
 *
 * @param local    If false, does not persist to local database. Default: true.
 * @param remote   If false, does not persist to remote database. Default: true.
 */
const updateThoughts = (state: State, { thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, contextChain, updates, local = true, remote = true }: Options) => {

  const contextIndexOld = { ...state.thoughts.contextIndex }
  const thoughtIndexOld = { ...state.thoughts.thoughtIndex }

  // if the new contextCache and thoughtCache exceed the maximum cache size, dequeue the excess and delete them from contextIndex and thoughtIndex
  const contextCacheAppended = [...state.thoughts.contextCache, ...Object.keys(contextIndexUpdates)]
  const thoughtCacheAppended = [...state.thoughts.thoughtCache, ...Object.keys(thoughtIndexUpdates)]
  const contextCacheNumInvalid = Math.max(0, contextCacheAppended.length - CONTEXT_CACHE_SIZE)
  const thoughtCacheNumInvalid = Math.max(0, thoughtCacheAppended.length - THOUGHT_CACHE_SIZE)
  const contextCacheUnique = contextCacheNumInvalid === 0 ? null : _.uniq(contextCacheAppended)
  const thoughtCacheUnique = thoughtCacheNumInvalid === 0 ? null : _.uniq(contextCacheUnique)
  const contextCache = contextCacheNumInvalid === 0 ? contextCacheAppended : contextCacheUnique!.slice(contextCacheNumInvalid)
  const thoughtCache = thoughtCacheNumInvalid === 0 ? thoughtCacheAppended : thoughtCacheUnique!.slice(thoughtCacheNumInvalid)
  const contextCacheInvalidated = contextCacheNumInvalid === 0 ? [] : contextCacheUnique!.slice(0, contextCacheNumInvalid)
  const thoughtCacheInvalidated = thoughtCacheNumInvalid === 0 ? [] : thoughtCacheUnique!.slice(0, thoughtCacheNumInvalid)

  contextCacheInvalidated.forEach(key => {
    if (!whitelistedThoughts.contextIndex[key]) {
      delete contextIndexOld[key] // eslint-disable-line fp/no-delete
    }
  })

  thoughtCacheInvalidated.forEach(key => {
    if (!whitelistedThoughts.thoughtIndex[key]) {
      delete thoughtIndexOld[key] // eslint-disable-line fp/no-delete
    }
  })

  const contextIndex = mergeUpdates(contextIndexOld, contextIndexUpdates)
  const thoughtIndex = mergeUpdates(thoughtIndexOld, thoughtIndexUpdates)

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
      syncQueue: [...state.syncQueue || [], batch],
      thoughts: {
        contextCache,
        contextIndex,
        thoughtCache,
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

export default _.curryRight(updateThoughts)
