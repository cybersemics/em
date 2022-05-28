import _ from 'lodash'
import { initialState } from '../util/initialState'
import { expandThoughts } from '../selectors'
import { editThoughtPayload } from '../reducers/editThought'
import { htmlToJson, importJSON, logWithTime, mergeUpdates, once, textToHtml, reducerFlow } from '../util'
import fifoCache from '../util/fifoCache'
import { EM_TOKEN, HOME_TOKEN, INITIAL_SETTINGS } from '../constants'
import { Context, Index, Lexeme, Thought, Path, PendingMerge, PushBatch, SimplePath, State } from '../@types'

export interface UpdateThoughtsOptions {
  lexemeIndexUpdates: Index<Lexeme | null>
  thoughtIndexUpdates: Index<Thought | null>
  recentlyEdited?: Index
  pendingDeletes?: { context: Context; thought: Thought }[]
  pendingEdits?: editThoughtPayload[]
  pendingPulls?: { path: Path }[]
  pendingMerges?: PendingMerge[]
  // By default, thoughts will be re-expanded with the fresh state. If a separate expandThoughts is called after updateThoughts within the same reducerFlow, then we can prevent expandThoughts here for better performance. See moveThought.
  preventExpandThoughts?: boolean
  contextChain?: SimplePath[]
  updates?: Index<string>
  local?: boolean
  remote?: boolean
  isLoading?: boolean
}

const contextCache = fifoCache<string>(10000)
const lexemeCache = fifoCache<string>(10000)

/**
 * Gets a list of whitelisted thoughts which are initialized only once. Whitelist the ROOT, EM, and EM descendants so they are never deleted from the thought cache when not present on the remote data source.
 */
export const getWhitelistedThoughts = once(() => {
  const state = initialState()

  const htmlSettings = textToHtml(INITIAL_SETTINGS)
  const jsonSettings = htmlToJson(htmlSettings)
  const settingsImported = importJSON(state, [EM_TOKEN] as SimplePath, jsonSettings)

  return {
    thoughtIndex: {
      ...state.thoughts.thoughtIndex,
      ...settingsImported.thoughtIndexUpdates,
    },
    lexemeIndex: {
      ...state.thoughts.lexemeIndex,
      ...settingsImported.lexemeIndexUpdates,
    },
  }
})

/** Returns true if a non-root context begins with HOME_TOKEN. Used as a data integrity check. */
// const isInvalidContext = (state: State, cx: ThoughtContext) => {
//   cx && cx.context && cx.context[0] === HOME_TOKEN && cx.context.length > 1
// }

/**
 * Updates lexemeIndex and thoughtIndex with any number of thoughts.
 *
 * @param local    If false, does not persist to local database. Default: true.
 * @param remote   If false, does not persist to remote database. Default: true.
 */
const updateThoughts = (
  state: State,
  {
    lexemeIndexUpdates,
    thoughtIndexUpdates,
    recentlyEdited,
    updates,
    pendingDeletes,
    pendingPulls,
    pendingMerges,
    preventExpandThoughts,
    local = true,
    remote = true,
    isLoading,
  }: UpdateThoughtsOptions,
) => {
  if (Object.keys(thoughtIndexUpdates).length === 0 && Object.keys(lexemeIndexUpdates).length === 0) return state

  const thoughtIndexOld = { ...state.thoughts.thoughtIndex }
  const lexemeIndexOld = { ...state.thoughts.lexemeIndex }

  // The thoughtIndex and lexemeIndex can consume more and more memory as thoughts are pulled from the db.
  // The contextCache and thoughtCache are used as a queue that is parallel to the thoughtIndex and lexemeIndex.
  // When thoughts are updated, they are prepended to the existing cache. (Duplicates are allowed.)
  // if the new contextCache and thoughtCache exceed the maximum cache size, dequeue the excess and delete them from thoughtIndex and lexemeIndex

  const thoughtIndexInvalidated = contextCache.addMany(Object.keys(thoughtIndexUpdates))
  const lexemeIndexInvalidated = lexemeCache.addMany(Object.keys(lexemeIndexUpdates))

  thoughtIndexInvalidated.forEach(key => {
    // @MIGRATION_TODO:  Fix this. state.expanded now uses hash of the path instead of hash of context.
    if (!getWhitelistedThoughts().thoughtIndex[key] && !state.expanded[key]) {
      delete thoughtIndexOld[key] // eslint-disable-line fp/no-delete
    }
  })

  lexemeIndexInvalidated.forEach(key => {
    // @MIGRATION_TODO:  Fix this. state.expanded now uses hash of the path instead of hash of context.
    if (!getWhitelistedThoughts().lexemeIndex[key] && !state.expanded[key]) {
      delete lexemeIndexOld[key] // eslint-disable-line fp/no-delete
    }
  })

  const thoughtIndex = mergeUpdates(thoughtIndexOld, thoughtIndexUpdates)
  const lexemeIndex = mergeUpdates(lexemeIndexOld, lexemeIndexUpdates)

  const recentlyEditedNew = recentlyEdited || state.recentlyEdited

  //  lexemes from the updates that are not available in the state yet.
  const pendingLexemes = Object.keys(lexemeIndexUpdates).reduce<Index<boolean>>((acc, thoughtId) => {
    const lexemeInState = state.thoughts.lexemeIndex[thoughtId]
    return {
      ...acc,
      ...(lexemeInState ? {} : { [thoughtId]: true }),
    }
  }, {})

  // updates are queued, detected by the pushQueue middleware, and sync'd with the local and remote stores
  const batch: PushBatch = {
    lexemeIndexUpdates,
    thoughtIndexUpdates: thoughtIndexUpdates,
    recentlyEdited: recentlyEditedNew,
    updates,
    pendingDeletes,
    pendingPulls,
    pendingMerges,
    local,
    remote,
    pendingLexemes,
  }

  logWithTime('updateThoughts: merge pushQueue')

  /** Returns false if the root thought is loaded and not pending. */
  const isStillLoading = () => {
    const rootThought = thoughtIndex[HOME_TOKEN] as Thought | null
    const thoughtsLoaded =
      rootThought &&
      !rootThought.pending &&
      // Disable isLoading if the root children have been loaded.
      // Otherwise NewThoughtInstructions will still be shown since there are no children to render.
      // If the root has no children and is no longer pending, we can disable isLoading immediately.
      (rootThought.children.length === 0 || rootThought.children.find(childId => thoughtIndex[childId]))
    return isLoading ?? !thoughtsLoaded
  }

  return reducerFlow([
    // update recentlyEdited, pushQueue, and thoughts
    state => ({
      ...state,
      // disable loading screen as soon as the root is loaded
      // or isLoading can be forced by passing it directly to updateThoughts
      isLoading: state.isLoading && isStillLoading(),
      recentlyEdited: recentlyEditedNew,
      // only push the batch to the pushQueue if syncing at least local or remote
      ...(batch.local || batch.remote ? { pushQueue: [...state.pushQueue, batch] } : null),
      thoughts: {
        thoughtIndex,
        lexemeIndex,
      },
    }),

    // Data Integrity Check
    // Catch Lexeme-Thought rank mismatches on empty thought.
    // Disable since 2-part moves rely on temporary invalid state.
    // Re-enable after Independent Editing (#495)

    // state => {
    //   // loop through all Lexemes that are being updated
    //   Object.values(lexemeIndexUpdates).forEach(lexeme => {
    //     // loop through each ThoughtContext of each Lexeme
    //     lexeme?.contexts.forEach(cx => {
    //       // find the Child with the same value and rank in the Thought
    //       const parent = getThoughtById(state, cx.context)
    //       const child = parent?.children.find(
    //         child => normalizeThought(child.value) === normalizeThought(lexeme.value) && child.rank === cx.rank,
    //       )
    //       if (!child) {
    //         console.error('lexeme', lexeme)
    //         console.error('parent', parent)
    //         throw new Error(
    //           `ThoughtContext for "${lexeme.value}" in ${JSON.stringify(cx.context)} with rank ${
    //             cx.rank
    //           } is not found in corresponding Thought.`,
    //         )
    //       }
    //     })
    //   })
    //   return state
    // },
    // calculate expanded using fresh thoughts and cursor
    !preventExpandThoughts
      ? state => ({
          ...state,
          expanded: expandThoughts(state, state.cursor),
        })
      : null,
  ])(state)
}

export default _.curryRight(updateThoughts)
