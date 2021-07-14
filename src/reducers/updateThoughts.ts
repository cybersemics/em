import _ from 'lodash'
import { Child, Context, Index, Lexeme, Parent, Path, PushBatch, SimplePath, State } from '../@types'
import { EM_TOKEN, HOME_TOKEN, INITIAL_SETTINGS } from '../constants'
import { editThoughtPayload } from '../reducers/editThought'
import { decodeThoughtsUrl, expandThoughts, getLexeme } from '../selectors'
import {
  htmlToJson,
  hashContext,
  importJSON,
  isRoot,
  logWithTime,
  mergeUpdates,
  once,
  textToHtml,
  reducerFlow,
} from '../util'
import fifoCache from '../util/fifoCache'
import { initialState } from '../util/initialState'

export interface UpdateThoughtsOptions {
  thoughtIndexUpdates: Index<Lexeme | null>
  contextIndexUpdates: Index<Parent | null>
  recentlyEdited?: Index
  pendingDeletes?: { context: Context; child: Child }[]
  pendingEdits?: editThoughtPayload[]
  pendingPulls?: { path: Path }[]
  descendantMoves?: { pathOld: Path; pathNew: Path }[]
  contextChain?: SimplePath[]
  updates?: Index<string>
  local?: boolean
  remote?: boolean
  isLoading?: boolean
}

const rootEncoded = hashContext([HOME_TOKEN])

const contextCache = fifoCache<string>(10000)
const lexemeCache = fifoCache<string>(10000)

/**
 * Gets a list of whitelisted thoughts which are initialized only once. Whitelist the ROOT, EM, and EM descendants so they are never deleted from the thought cache when not present on the remote data source.
 */
export const getWhitelistedThoughts = once(() => {
  const state = initialState()

  const htmlSettings = textToHtml(INITIAL_SETTINGS)
  const jsonSettings = htmlToJson(htmlSettings)
  const settingsImported = importJSON(state, [{ value: EM_TOKEN, rank: 0 }] as SimplePath, jsonSettings)

  return {
    contextIndex: {
      ...state.thoughts.contextIndex,
      ...settingsImported.contextIndexUpdates,
    },
    thoughtIndex: {
      ...state.thoughts.thoughtIndex,
      ...settingsImported.thoughtIndexUpdates,
    },
  }
})

/**
 * Updates thoughtIndex and contextIndex with any number of thoughts.
 *
 * @param local    If false, does not persist to local database. Default: true.
 * @param remote   If false, does not persist to remote database. Default: true.
 */
const updateThoughts = (
  state: State,
  {
    thoughtIndexUpdates,
    contextIndexUpdates,
    recentlyEdited,
    updates,
    pendingDeletes,
    pendingEdits,
    descendantMoves,
    pendingPulls,
    local = true,
    remote = true,
    isLoading,
  }: UpdateThoughtsOptions,
) => {
  const contextIndexOld = { ...state.thoughts.contextIndex }
  const thoughtIndexOld = { ...state.thoughts.thoughtIndex }

  // The contextIndex and thoughtIndex can consume more and more memory as thoughts are pulled from the db.
  // The contextCache and thoughtCache are used as a queue that is parallel to the contextIndex and thoughtIndex.
  // When thoughts are updated, they are prepended to the existing cache. (Duplicates are allowed.)
  // if the new contextCache and thoughtCache exceed the maximum cache size, dequeue the excess and delete them from contextIndex and thoughtIndex

  const contextIndexInvalidated = contextCache.addMany(Object.keys(contextIndexUpdates))
  const thoughtIndexInvalidated = lexemeCache.addMany(Object.keys(thoughtIndexUpdates))

  contextIndexInvalidated.forEach(key => {
    if (!getWhitelistedThoughts().contextIndex[key] && !state.expanded[key]) {
      delete contextIndexOld[key] // eslint-disable-line fp/no-delete
    }
  })

  thoughtIndexInvalidated.forEach(key => {
    if (!getWhitelistedThoughts().thoughtIndex[key] && !state.expanded[key]) {
      delete thoughtIndexOld[key] // eslint-disable-line fp/no-delete
    }
  })

  const contextIndex = mergeUpdates(contextIndexOld, contextIndexUpdates)
  const thoughtIndex = mergeUpdates(thoughtIndexOld, thoughtIndexUpdates)

  const recentlyEditedNew = recentlyEdited || state.recentlyEdited

  //  lexemes from the updates that are not available in the state yet.
  const pendingLexemes = Object.keys(thoughtIndexUpdates).reduce<Index<boolean>>((acc, thoughtId) => {
    const lexemeInState = state.thoughts.thoughtIndex[thoughtId]
    return {
      ...acc,
      ...(lexemeInState ? {} : { [thoughtId]: true }),
    }
  }, {})

  // updates are queued, detected by the pushQueue middleware, and sync'd with the local and remote stores
  const batch: PushBatch = {
    thoughtIndexUpdates,
    contextIndexUpdates,
    recentlyEdited: recentlyEditedNew,
    updates,
    pendingDeletes,
    pendingEdits,
    descendantMoves,
    pendingPulls,
    local,
    remote,
    pendingLexemes,
  }

  logWithTime('updateThoughts: merge pushQueue')

  /** Returns true if the root is no longer pending or the contextIndex has at least one non-EM thought. */
  const cursorParent = contextIndex[rootEncoded] as Parent | null
  const thoughtsLoaded =
    !cursorParent?.pending ||
    Object.keys(contextIndex).some(key => key !== rootEncoded && contextIndex[key].context[0] !== EM_TOKEN)
  const stillLoading = state.isLoading ? isLoading ?? !thoughtsLoaded : false

  return reducerFlow([
    // update recentlyEdited, pushQueue, and thoughts
    state => ({
      ...state,
      // disable loading screen as soon as the root or the first non-EM thought is loaded
      // or isLoading can be forced by passing it directly to updateThoughts
      isLoading: stillLoading,
      recentlyEdited: recentlyEditedNew,
      // only push the batch to the pushQueue if syncing at least local or remote
      ...(batch.local || batch.remote ? { pushQueue: [...state.pushQueue, batch] } : null),
      thoughts: {
        contextIndex,
        thoughtIndex,
      },
    }),

    // Reset cursor on first load. The pullQueue can determine which contexts to load from the url, but cannot determine the full cursor (with ranks) until the thoughts have been loaded. To make it source agnostic, we decode the url here.
    !state.cursorInitialized
      ? state => {
          const { contextViews, path } = decodeThoughtsUrl(state, window.location.pathname)
          const cursorNew = !path || isRoot(path) ? null : path
          const isCursorLoaded = cursorNew?.every(child => getLexeme(state, child.value))

          return isCursorLoaded || !cursorNew
            ? {
                ...state,
                contextViews,
                cursor: cursorNew,
                cursorInitialized: true,
              }
            : {
                ...state,
                cursor: cursorNew,
              }
        }
      : null,

    // calculate expanded using fresh thoughts and cursor
    state => ({
      ...state,
      expanded: expandThoughts(state, state.cursor),
    }),
  ])(state)
}

export default _.curryRight(updateThoughts)
