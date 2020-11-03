import _ from 'lodash'
import { initialState, State, SyncBatch } from '../util/initialState'
import { decodeThoughtsUrl, expandThoughts } from '../selectors'
import { hashContext, importHtml, isRoot, logWithTime, mergeUpdates, reducerFlow } from '../util'
import { CONTEXT_CACHE_SIZE, EM_TOKEN, INITIAL_SETTINGS, ROOT_TOKEN, THOUGHT_CACHE_SIZE } from '../constants'
import { Child, Context, ContextHash, Index, Lexeme, Parent, SimplePath, ThoughtHash, ThoughtIndices, ThoughtsInterface } from '../types'

export interface UpdateThoughtsOptions {
  thoughtIndexUpdates: Index<Lexeme | null>,
  contextIndexUpdates: Index<Parent | null>,
  recentlyEdited?: Index,
  pendingDeletes?: { context: Context, child: Child }[],
  contextChain?: SimplePath[],
  updates?: Index<string>,
  local?: boolean,
  remote?: boolean,
}

const rootEncoded = hashContext([ROOT_TOKEN])

// we should not delete ROOT, EM, or EM descendants from state
// whitelist them until we have a better solution
// eslint-disable-next-line fp/no-let
let whitelistedThoughts: ThoughtIndices

// delay so util is fully loaded, otherwise importHtml will error out with "pathToContext is not a function"
setTimeout(() => {

  const state = initialState()

  const {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
  } = importHtml(state, [{ value: EM_TOKEN, rank: 0 }] as SimplePath, INITIAL_SETTINGS)

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

/** Returns true if the root is no longer pending or the contextIndex has at least one non-EM thought. */
const thoughtsLoaded = (thoughts: ThoughtsInterface) => {
  const { contextIndex } = thoughts
  const rootParent = contextIndex[rootEncoded] as Parent | null
  return !rootParent?.pending ||
    Object.keys(contextIndex).some(key => key !== rootEncoded && contextIndex[key].context[0] !== EM_TOKEN)
}

/**
 * Updates thoughtIndex and contextIndex with any number of thoughts.
 *
 * @param local    If false, does not persist to local database. Default: true.
 * @param remote   If false, does not persist to remote database. Default: true.
 */
const updateThoughts = (state: State, { thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, updates, pendingDeletes, local = true, remote = true }: UpdateThoughtsOptions) => {

  const contextIndexOld = { ...state.thoughts.contextIndex }
  const thoughtIndexOld = { ...state.thoughts.thoughtIndex }

  // if the new contextCache and thoughtCache exceed the maximum cache size, dequeue the excess and delete them from contextIndex and thoughtIndex
  const contextCacheAppended = [...state.thoughts.contextCache, ...Object.keys(contextIndexUpdates)] as ContextHash[]
  const thoughtCacheAppended = [...state.thoughts.thoughtCache, ...Object.keys(thoughtIndexUpdates)] as ThoughtHash[]
  const contextCacheNumInvalid = Math.max(0, contextCacheAppended.length - CONTEXT_CACHE_SIZE)
  const thoughtCacheNumInvalid = Math.max(0, thoughtCacheAppended.length - THOUGHT_CACHE_SIZE)
  const contextCacheUnique = contextCacheNumInvalid === 0 ? null : _.uniq(contextCacheAppended) as ContextHash[]
  const thoughtCacheUnique = thoughtCacheNumInvalid === 0 ? null : _.uniq(thoughtCacheAppended) as ThoughtHash[]
  const contextCache = contextCacheNumInvalid === 0 ? contextCacheAppended : contextCacheUnique!.slice(contextCacheNumInvalid) as ContextHash[]
  const thoughtCache = thoughtCacheNumInvalid === 0 ? thoughtCacheAppended : thoughtCacheUnique!.slice(thoughtCacheNumInvalid) as ThoughtHash[]
  const contextCacheInvalidated = contextCacheNumInvalid === 0 ? [] : contextCacheUnique!.slice(0, contextCacheNumInvalid) as ContextHash[]
  const thoughtCacheInvalidated = thoughtCacheNumInvalid === 0 ? [] : thoughtCacheUnique!.slice(0, thoughtCacheNumInvalid) as ThoughtHash[]

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
  const batch: SyncBatch = {
    thoughtIndexUpdates,
    contextIndexUpdates,
    recentlyEdited: recentlyEditedNew,
    updates,
    pendingDeletes,
    local,
    remote
  }

  logWithTime('updateThoughts: merge syncQueue')

  const thoughts: ThoughtsInterface = {
    contextCache,
    contextIndex,
    thoughtCache,
    thoughtIndex,
  }

  return reducerFlow([

    // update recentlyEdited, syncQueue, and thoughts
    state => ({
      ...state,
      // disable loading screen as soon as the root or the first non-EM thought is loaded
      isLoading: state.isLoading ? !thoughtsLoaded(thoughts) : false,
      recentlyEdited: recentlyEditedNew,
      syncQueue: [...state.syncQueue, batch],
      thoughts,
    }),

    // Decode cursor from url if null. This occurs when the page first loads. The thoughtCache can determine which contexts to load from the url, but cannot determine the full cursor (with ranks) until the thoughts have been loaded. To make it source agnostic, we decode the url here.
    !state.cursor
      ? state => {
        const { contextViews, path } = decodeThoughtsUrl(state, window.location.pathname)
        const cursorNew = !path || isRoot(path) ? null : path
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
      expanded: expandThoughts(state, state.cursor),
    })

  ])(state)
}

export default _.curryRight(updateThoughts)
