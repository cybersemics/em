import _ from 'lodash'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Path from '../@types/Path'
import PushBatch from '../@types/PushBatch'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import { EM_TOKEN, HOME_TOKEN, INITIAL_SETTINGS } from '../constants'
import { editThoughtPayload } from '../reducers/editThought'
import expandThoughts from '../selectors/expandThoughts'
import getThoughtById from '../selectors/getThoughtById'
import htmlToJson from '../util/htmlToJson'
import importJSON from '../util/importJSON'
import initialState from '../util/initialState'
import logWithTime from '../util/logWithTime'
import mergeUpdates from '../util/mergeUpdates'
import once from '../util/once'
import reducerFlow from '../util/reducerFlow'
import textToHtml from '../util/textToHtml'

export interface UpdateThoughtsOptions {
  lexemeIndexUpdates: Index<Lexeme | null>
  thoughtIndexUpdates: Index<Thought | null>
  recentlyEdited?: Index
  pendingDeletes?: { pathParent: Path; thought: Thought }[]
  pendingEdits?: editThoughtPayload[]
  pendingPulls?: { path: Path }[]
  // By default, thoughts will be re-expanded with the fresh state. If a separate expandThoughts is called after updateThoughts within the same reducerFlow, then we can prevent expandThoughts here for better performance. See moveThought.
  preventExpandThoughts?: boolean
  contextChain?: SimplePath[]
  updates?: Index<string>
  local?: boolean
  remote?: boolean
  isLoading?: boolean
}

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
    preventExpandThoughts,
    local = true,
    remote = true,
    isLoading,
  }: UpdateThoughtsOptions,
) => {
  if (Object.keys(thoughtIndexUpdates).length === 0 && Object.keys(lexemeIndexUpdates).length === 0) return state

  const thoughtIndexOld = { ...state.thoughts.thoughtIndex }
  const lexemeIndexOld = { ...state.thoughts.lexemeIndex }

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
    thoughtIndexUpdates,
    recentlyEdited: recentlyEditedNew,
    updates,
    pendingDeletes,
    pendingPulls,
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
      (Object.keys(rootThought.childrenMap).length === 0 ||
        Object.values(rootThought.childrenMap).find(childId => thoughtIndex[childId]))
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
    // calculate expanded using fresh thoughts and cursor
    !preventExpandThoughts
      ? state => ({
          ...state,
          expanded: expandThoughts(state, state.cursor),
        })
      : null,

    // Data Integrity Checks
    // These can be removed after the upstream problem is identified.
    state => {
      Object.values(thoughtIndexUpdates).forEach(thought => {
        if (!thought) return

        if ('children' in thought) {
          console.info('thought', thought)
          throw new Error(
            'Thoughts in State should not have children property. Only the database should contain inline children.',
          )
        }

        // Check if any thought's children's parentId does not match the thought's id.
        const children = Object.values(thought.childrenMap || {})
          .map(id => getThoughtById(state, id))
          // the child may not exist in the thoughtIndex yet if it is pending
          .filter(Boolean)
        children.forEach(child => {
          if (child.parentId !== thought.id) {
            console.info('child', child)
            console.info('thought', thought)
            throw new Error('child.parentId !== thought.id')

            // or warn instead of hard fail
            // console.warn(`child.parentId of ${child.parentId} does not match thought.id of ${thought.id}`)
            // console.info('thought', thought)
            // console.info('child', child)
            // console.info('child parent', getThoughtById(state, child.parentId))
            // if (thoughtIndexUpdates[child.id]) {
            //   thoughtIndexUpdates[child.id]!.parentId = thought.id
            //   console.info('repaired')
            // }
          }
        })
      })

      return state
    },
  ])(state)
}

export default _.curryRight(updateThoughts)
