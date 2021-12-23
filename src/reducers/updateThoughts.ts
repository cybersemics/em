import _ from 'lodash'
import { initialState } from '../util/initialState'
import { expandThoughts, isDescendantOfEmContext } from '../selectors'
import { editThoughtPayload } from '../reducers/editThought'
import { htmlToJson, importJSON, logWithTime, mergeUpdates, once, textToHtml, reducerFlow } from '../util'
import fifoCache from '../util/fifoCache'
import { EM_TOKEN, HOME_TOKEN, INITIAL_SETTINGS } from '../constants'
import { Context, Index, Lexeme, Parent, Path, PushBatch, SimplePath, State } from '../@types'

export interface UpdateThoughtsOptions {
  thoughtIndexUpdates: Index<Lexeme | null>
  contextIndexUpdates: Index<Parent | null>
  recentlyEdited?: Index
  pendingDeletes?: { context: Context; thought: Parent }[]
  pendingEdits?: editThoughtPayload[]
  pendingPulls?: { path: Path }[]
  contextChain?: SimplePath[]
  updates?: Index<string>
  local?: boolean
  remote?: boolean
  isLoading?: boolean
}

const rootEncoded = HOME_TOKEN

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

/** Returns true if a non-root context begins with HOME_TOKEN. Used as a data integrity check. */
// const isInvalidContext = (state: State, cx: ThoughtContext) => {
//   cx && cx.context && cx.context[0] === HOME_TOKEN && cx.context.length > 1
// }

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
    pendingPulls,
    local = true,
    remote = true,
    isLoading,
  }: UpdateThoughtsOptions,
) => {
  if (Object.keys(contextIndexUpdates).length === 0 && Object.keys(thoughtIndexUpdates).length === 0) return state

  const contextIndexOld = { ...state.thoughts.contextIndex }
  const thoughtIndexOld = { ...state.thoughts.thoughtIndex }

  // Data Integrity Checks

  // Sometimes Child objects are missing their value property
  // Check all updates in case the problem is in the subscription logic
  // Object.values(contextIndexUpdates).forEach(parentUpdate =>
  //   parentUpdate?.children.forEach(childId => {
  //     const thought = state.thoughts.contextIndex[childId]

  //     if (!thought) {
  //       throw new Error(`Parent entry for id ${childId} not found!`)
  //     }
  //     if (thought.value == null || thought.rank == null) {
  //       console.error('child', thought)
  //       console.error('parent', parentUpdate)
  //       throw new Error('Thought is missing a value property')
  //     }
  //   }),
  // )

  // TODO: FIx this data integrity check.
  // For efficiency, only check new updates, i.e. when local && remote are true.
  // This will stop these data integrity issues from ever getting persisted.
  // if (local && remote) {
  // A non-root context should never begin with HOME_TOKEN.
  // If one is found, it means there was a data integrity error that needs to be identified immediately.
  // if (Object.values(thoughtIndexUpdates).some(lexeme => lexeme?.contexts.some(isInvalidContext))) {
  //   const invalidLexemes = Object.values(thoughtIndexUpdates).filter(lexeme =>
  //     lexeme?.contexts.some(isInvalidContext),
  //   ) as Lexeme[]
  //   if (invalidLexemes.length > 0) {
  //     invalidLexemes.forEach(lexeme => {
  //       console.error(
  //         `Invalid ThoughtContext found in Lexeme: '${lexeme.value}'. HOME_TOKEN should be omitted from the beginning; it is only valid to refer to the home context itself, i.e. [HOME_TOKEN].`,
  //         lexeme.contexts,
  //       )
  //     })
  //     throw new Error('Invalid ThoughtContext')
  //   }
  // }
  // }

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
    Object.keys(contextIndex).some(key => key !== rootEncoded && isDescendantOfEmContext(state, contextIndex[key].id))
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

    // Data Integrity Check
    // Catch Lexeme-Parent rank mismatches on empty thought.
    // Disable since 2-part moves rely on temporary invalid state.
    // Re-enable after Independent Editing (#495)

    // state => {
    //   // loop through all Lexemes that are being updated
    //   Object.values(thoughtIndexUpdates).forEach(lexeme => {
    //     // loop through each ThoughtContext of each Lexeme
    //     lexeme?.contexts.forEach(cx => {
    //       // find the Child with the same value and rank in the Parent
    //       const parent = getParent(state, cx.context)
    //       const child = parent?.children.find(
    //         child => normalizeThought(child.value) === normalizeThought(lexeme.value) && child.rank === cx.rank,
    //       )
    //       if (!child) {
    //         console.error('lexeme', lexeme)
    //         console.error('parent', parent)
    //         throw new Error(
    //           `ThoughtContext for "${lexeme.value}" in ${JSON.stringify(cx.context)} with rank ${
    //             cx.rank
    //           } is not found in corresponding Parent.`,
    //         )
    //       }
    //     })
    //   })
    //   return state
    // },
    // calculate expanded using fresh thoughts and cursor
    state => ({
      ...state,
      expanded: expandThoughts(state, state.cursor),
    }),
  ])(state)
}

export default _.curryRight(updateThoughts)
