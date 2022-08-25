import _ from 'lodash'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import PushBatch from '../@types/PushBatch'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, MAX_JUMPS } from '../constants'
import { editThoughtPayload } from '../reducers/editThought'
import expandThoughts from '../selectors/expandThoughts'
import { getLexeme } from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import equalPath from '../util/equalPath'
import keyValueBy from '../util/keyValueBy'
import logWithTime from '../util/logWithTime'
import mergeUpdates from '../util/mergeUpdates'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'

export type UpdateThoughtsOptions = PushBatch & {
  contextChain?: SimplePath[]
  isLoading?: boolean
  pendingEdits?: editThoughtPayload[]
  // By default, thoughts will be re-expanded with the fresh state. If a separate expandThoughts is called after updateThoughts within the same reducerFlow, then we can prevent expandThoughts here for better performance. See moveThought.
  preventExpandThoughts?: boolean
}

/** Creates a reducer spy that throws an error if any data integrity issues are found, including invalid parentIds and missing Lexemes. */
const dataIntegrityCheck =
  (thoughtIndexUpdates: Index<Thought | null>, lexemeIndexUpdates: Index<Lexeme | null>) => (state: State) => {
    // undefined thought value
    Object.entries(thoughtIndexUpdates).forEach(([id, thought]) => {
      if (!thought) return
      if (thought.value == null) {
        console.error('id', id)
        console.error('thought', thought)
        throw new Error('Missing thought value')
      }
    })

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
      } else if (Array.from(lexeme as any).length === 21) {
        throw new Error(`Lexeme has been converted to an array? That can't be right.`)
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
    pendingLexemes,
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

  // lexemes from the updates that are not available in the state yet
  // pull pending Lexemes when updates are being saved to local and remote, i.e. user edits, not updates from pull
  const pendingLexemesUpdated =
    local && remote
      ? Object.keys(lexemeIndexUpdates).reduce<Index<boolean>>((acc, thoughtId) => {
          const lexemeInState = state.thoughts.lexemeIndex[thoughtId]
          return {
            ...acc,
            ...(lexemeInState ? {} : { [thoughtId]: true }),
          }
        }, {})
      : {}

  // When a thought is deleted or moved, it needs to be removed from its old parent's inline children.
  // Unfortunately, neither push nor firebase have access to the old parent, so we need to construct the updates here.
  // This causes inline children to leak into updateThoughts, which is not ideal architecturally.
  // Consider this a provisional solution that should be replaced. If it is not replaced entirely by a 3rd party sync-capable db, then we may need PushBatch to contain diffs and update types (move, edit, delete) rather than just synchronic updates.
  const inlineChildrenDeletes = keyValueBy(thoughtIndexUpdates, (id, thoughtUpdate) => {
    const thoughtOld = getThoughtById(state, id as ThoughtId)
    const parentOld = thoughtOld ? getThoughtById(state, thoughtOld.parentId) : null
    const parentNew = thoughtOld ? thoughtIndex[thoughtOld.parentId] : null

    // On delete or move, delete the thought from its parent's inline children.
    // If parentOld is deleted in another batch, it is possible to get a deletion update for a thought and a deletion update for its inline child at the same time, which will throw an error in firebase. This is handled downstream by the firebase provider, since we only have access to a single batch here.
    const isDelete = !thoughtUpdate
    const isMove = thoughtOld && parentOld && thoughtOld.parentId !== thoughtUpdate?.parentId
    return parentNew && (isDelete || isMove)
      ? {
          [`thoughtIndex/${thoughtOld.parentId}/children/${id}`]: null,
        }
      : null
  })

  // updates are queued, detected by the pushQueue middleware, and sync'd with the local and remote stores
  const batch: PushBatch = {
    lexemeIndexUpdates,
    local,
    pendingDeletes,
    pendingLexemes: { ...pendingLexemesUpdated, ...pendingLexemes },
    recentlyEdited: recentlyEditedNew,
    remote,
    thoughtIndexUpdates: thoughtIndexUpdates,
    updates: {
      ...updates,
      ...inlineChildrenDeletes,
    },
  }

  logWithTime('updateThoughts: merge pushQueue')

  /** Returns false if the root thought is loaded and not pending. */
  const isStillLoading = () => {
    const rootThought = thoughtIndexUpdates[HOME_TOKEN] || (thoughtIndex[HOME_TOKEN] as Thought | null)
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
    // state changes that rely on new state
    state => {
      const lastJump = state.jumpHistory[0]
      const lastJumpParent = lastJump ? parentOf(lastJump) : null
      const cursorParent = state.cursor ? parentOf(state.cursor) : null

      /** Returns true if the cursor and last jump point are parent-child or child-parent. When this is true, the cursor will replace the last jump history entry rather than appending to it. */
      const isParentChild = () =>
        !!state.cursor &&
        state.cursor.length > 0 &&
        !!lastJump &&
        lastJump.length > 0 &&
        (equalPath(lastJumpParent, state.cursor) || equalPath(lastJump, cursorParent))

      return {
        ...state,
        // append old cursor to jump history if different
        // replace last jump if adjacent
        // limit to MAX_JUMPS
        // See: State.jumpHistory
        ...(lastJump !== state.cursor
          ? { jumpHistory: [state.cursor, ...state.jumpHistory.slice(isParentChild() ? 1 : 0, MAX_JUMPS)] }
          : null),
        // calculate expanded using fresh thoughts and cursor
        ...(!preventExpandThoughts ? { expanded: expandThoughts(state, state.cursor) } : null),
      }
    },

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
