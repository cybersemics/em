import _ from 'lodash'
import { State, PushBatch } from '../util/initialState'
import { decodeThoughtsUrl, expandThoughts } from '../selectors'
import { ExistingThoughtChangePayload } from '../reducers/existingThoughtChange'
import { hashContext, logWithTime, mergeUpdates, reducerFlow, getWhitelistedThoughts, isRoot } from '../util'
import { CONTEXT_CACHE_SIZE, EM_TOKEN, HOME_TOKEN, THOUGHT_CACHE_SIZE } from '../constants'
import { Child, Context, ContextHash, Index, Lexeme, Parent, Path, SimplePath, ThoughtHash, ThoughtsInterface } from '../types'

export interface UpdateThoughtsOptions {
  thoughtIndexUpdates: Index<Lexeme | null>,
  contextIndexUpdates: Index<Parent | null>,
  recentlyEdited?: Index,
  pendingDeletes?: { context: Context, child: Child }[],
  pendingEdits?: ExistingThoughtChangePayload[],
  pendingMoves?: { pathOld: Path, pathNew: Path }[],
  contextChain?: SimplePath[],
  updates?: Index<string>,
  local?: boolean,
  remote?: boolean,
  isLoading?: boolean,
}

const rootEncoded = hashContext([HOME_TOKEN])

/**
 * Updates thoughtIndex and contextIndex with any number of thoughts.
 *
 * @param local    If false, does not persist to local database. Default: true.
 * @param remote   If false, does not persist to remote database. Default: true.
 */
const updateThoughts = (state: State, { thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, updates, pendingDeletes, pendingEdits, pendingMoves, local = true, remote = true, isLoading }: UpdateThoughtsOptions) => {

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
    if (!getWhitelistedThoughts().contextIndex[key]) {
      delete contextIndexOld[key] // eslint-disable-line fp/no-delete
    }
  })

  thoughtCacheInvalidated.forEach(key => {
    if (!getWhitelistedThoughts().thoughtIndex[key]) {
      delete thoughtIndexOld[key] // eslint-disable-line fp/no-delete
    }
  })

  const contextIndex = mergeUpdates(contextIndexOld, contextIndexUpdates)
  const thoughtIndex = mergeUpdates(thoughtIndexOld, thoughtIndexUpdates)

  const recentlyEditedNew = recentlyEdited || state.recentlyEdited

  // updates are queued, detected by the pushQueue middleware, and sync'd with the local and remote stores
  const batch: PushBatch = {
    thoughtIndexUpdates,
    contextIndexUpdates,
    recentlyEdited: recentlyEditedNew,
    updates,
    pendingDeletes,
    pendingEdits,
    pendingMoves,
    local,
    remote
  }

  logWithTime('updateThoughts: merge pushQueue')

  const thoughts: ThoughtsInterface = {
    contextCache,
    contextIndex,
    thoughtCache,
    thoughtIndex,
  }

  /** Returns true if the root is no longer pending or the contextIndex has at least one non-EM thought. */
  const cursorParent = thoughts.contextIndex[rootEncoded] as Parent | null
  const thoughtsLoaded = !cursorParent?.pending ||
    Object.keys(thoughts.contextIndex).some(key => key !== rootEncoded && thoughts.contextIndex[key].context[0] !== EM_TOKEN)
  const stillLoading = state.isLoading ? isLoading ?? !thoughtsLoaded : false

  return reducerFlow([

    // update recentlyEdited, pushQueue, and thoughts
    state => ({
      ...state,
      // disable loading screen as soon as the root or the first non-EM thought is loaded
      // or isLoading can be forced by passing it directly to updateThoughts
      isLoading: stillLoading,
      recentlyEdited: recentlyEditedNew,
      pushQueue: [...state.pushQueue, batch],
      thoughts,
    }),

    // Reset cursor on first load. The pullQueue can determine which contexts to load from the url, but cannot determine the full cursor (with ranks) until the thoughts have been loaded. To make it source agnostic, we decode the url here.
    // state.cursor should always be null here, but check to make sure we're not overriding it
    !state.cursorInitialized && !state.cursor
      ? state => {
        const { contextViews, path } = decodeThoughtsUrl(state, window.location.pathname)
        const cursorNew = !path || isRoot(path) ? null : path
        return {
          ...state,
          contextViews,
          cursor: cursorNew,
          cursorInitialized: true,
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
