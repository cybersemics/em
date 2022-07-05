import _ from 'lodash'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Path from '../@types/Path'
import PushBatch from '../@types/PushBatch'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN } from '../constants'
import { editThoughtPayload } from '../reducers/editThought'
import expandThoughts from '../selectors/expandThoughts'
import { getLexeme } from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import logWithTime from '../util/logWithTime'
import mergeUpdates from '../util/mergeUpdates'
import reducerFlow from '../util/reducerFlow'

export interface UpdateThoughtsOptions {
  contextChain?: SimplePath[]
  isLoading?: boolean
  lexemeIndexUpdates: Index<Lexeme | null>
  local?: boolean
  pendingDeletes?: Path[]
  pendingEdits?: editThoughtPayload[]
  // By default, thoughts will be re-expanded with the fresh state. If a separate expandThoughts is called after updateThoughts within the same reducerFlow, then we can prevent expandThoughts here for better performance. See moveThought.
  preventExpandThoughts?: boolean
  recentlyEdited?: Index
  remote?: boolean
  thoughtIndexUpdates: Index<Thought | null>
  updates?: Index<string>
}

/** Creates a reducer spy that throws an error if any data integrity issues are found, including invalid parentIds and missing Lexemes. */
const dataIntegrityCheck =
  (thoughtIndexUpdates: Index<Thought | null>, lexemeIndexUpdates: Index<Lexeme | null>) => (state: State) => {
    Object.values(thoughtIndexUpdates).forEach(thought => {
      if (!thought) return

      // disallow children property
      if ('children' in thought) {
        console.error('thought', thought)
        throw new Error(
          'Thoughts in State should not have children property. Only the database should contain inline children.',
        )
      }

      // make sure thought.parentId exists in thoughtIndex
      if (
        ![HOME_TOKEN, EM_TOKEN, ABSOLUTE_TOKEN].includes(thought.id) &&
        !getThoughtById(state, thought.parentId) &&
        // Unfortunately 2-part deletes produce false positives of invalid parentId.
        // False positives occur in Part II, so we can't check pendingDeletes (it has already been flushed).
        // Instead, check the undo patch and disable the check if the last action is deleteThought or deleteThoughtWithCursor.
        // It's hacky, but it seems better than omitting the check completely.
        // If we get more false positives or false negatives, we can adjust the condition.
        !state.undoPatches[state.undoPatches.length - 1]?.[0].actions[0]?.startsWith('deleteThought')
      ) {
        console.error('thought', thought)
        throw new Error(`Parent ${thought.parentId} of ${thought.value} (${thought.id}) does not exist`)
      }

      // make sure thought's children's parentId matches the thought's id.
      const children = Object.values(thought.childrenMap || {})
        .map(id => getThoughtById(state, id))
        // the child may not exist in the thoughtIndex yet if it is pending
        .filter(Boolean)
      children.forEach(child => {
        if (child.parentId !== thought.id) {
          console.error('child', child)
          console.error('thought', thought)
          throw new Error('child.parentId !== thought.id')
        }
      })

      // assert that a lexeme exists for the thought
      const lexeme = getLexeme(state, thought.value)
      if (!lexeme) {
        console.error('thought', thought)
        throw new Error(`Thought "${thought.value}" (${thought.id}) is missing a corresponding Lexeme.`)
      } else if (
        ![HOME_TOKEN, EM_TOKEN, ABSOLUTE_TOKEN].includes(thought.id) &&
        !lexeme.contexts.some(cx => cx === thought.id)
      ) {
        console.error('lexemeIndexUpdates', lexemeIndexUpdates)
        console.error('thoughtIndexUpdates', thoughtIndexUpdates)
        console.error('thought', thought)
        console.error('lexeme', lexeme)
        throw new Error(`Thought "${thought.value}" (${thought.id}) is missing from its Lexeme's contexts.`)
      }
    })

    return state
  }

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

    // data integrity checks
    // immediately throws if any data integity issues are found
    // otherwise noop
    state => {
      dataIntegrityCheck(thoughtIndexUpdates, lexemeIndexUpdates)
      return state
    },
  ])(state)
}

export default _.curryRight(updateThoughts)
