import _ from 'lodash'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Path from '../@types/Path'
import PushBatch from '../@types/PushBatch'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import Thunk from '../@types/Thunk'
import { editThoughtPayload } from '../actions/editThought'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, MAX_JUMPS } from '../constants'
import expandThoughts from '../selectors/expandThoughts'
import { getLexeme } from '../selectors/getLexeme'
import getSetting from '../selectors/getSetting'
import getThoughtById from '../selectors/getThoughtById'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import thoughtToPath from '../selectors/thoughtToPath'
import equalPath from '../util/equalPath'
import head from '../util/head'
import keyValueBy from '../util/keyValueBy'
import mergeUpdates from '../util/mergeUpdates'
import nonNull from '../util/nonNull'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'

/** A reducer that prepends the cursor to the the jump history. If the cursor is the same as the last jump point, does nothing. If the cursor is adjacent to the last jump point (parent, child, or sibling of), then it replaces the last jump point. See actions/jump.ts and State.jumpHistory. */
const updateJumpHistory = (state: State): State => {
  const lastJump = state.jumpHistory[0]
  const lastJumpParent = lastJump ? parentOf(lastJump) : null
  const cursorParent = state.cursor ? parentOf(state.cursor) : null

  /** Returns true if the cursor is the parent, child, or sibling of the last jump point. When this is true, the cursor will replace the last jump history entry rather than appending to it, thus preserving only the last edit cursor among a group of proximal edits. */
  const isAdjacent = () =>
    !!state.cursor &&
    state.cursor.length > 0 &&
    !!lastJump &&
    lastJump.length > 0 &&
    // parent
    (equalPath(lastJumpParent, state.cursor) ||
      // child
      equalPath(lastJump, cursorParent) ||
      // sibling
      equalPath(lastJumpParent, cursorParent))

  // append old cursor to jump history if different
  // replace last jump if adjacent
  // limit to MAX_JUMPS
  // See: State.jumpHistory
  return lastJump !== state.cursor
    ? {
        ...state,
        jumpHistory: [state.cursor, ...state.jumpHistory.slice(isAdjacent() ? 1 : 0, MAX_JUMPS)],
        jumpIndex: 0,
      }
    : state
}

export type UpdateThoughtsOptions = Omit<PushBatch, 'lexemeIndexUpdatesOld'> & {
  contextChain?: SimplePath[]
  // callback for when the updates have been synced with IDB
  idbSynced?: () => void
  isLoading?: boolean
  pendingEdits?: editThoughtPayload[]
  /** By default, thoughts will be re-expanded with the fresh state. If a separate expandThoughts is called after updateThoughts within the same reducerFlow, then we can prevent expandThoughts here for better performance. See moveThought. */
  preventExpandThoughts?: boolean
  /** Allow non-pending thoughts to become pending. This is mainly used by freeThoughts. */
  overwritePending?: boolean
  /**
   * If true, check if the cursor is valid, and if not, move it to the closest valid ancestor.
   * This should only be used when the updates are coming from another device. For local updates, updateThoughts is typically called within a higher level reducer (e.g. moveThought) which handles all cursor updates. There would be false positives during local updates since the cursor is updated after updateThoughts.
   */
  repairCursor?: boolean
}

/** A reducer that repairs the cursor if it moved or was deleted. */
// TODO: Not fully tested when cursor is in a context view.
const repairCursorReducer = (state: State): State => {
  if (!state.cursor) return state

  const simplePath = simplifyPath(state, state.cursor)
  let cursorNew: Path | null | undefined

  // cursor was moved but still exists
  // update the cursor to the new path
  const cursorThought = pathToThought(state, state.cursor)
  if (cursorThought) {
    const recalculatedCursor = thoughtToPath(state, head(simplePath))
    if (!_.isEqual(recalculatedCursor, simplePath)) {
      cursorNew = recalculatedCursor
    }
  }
  // cursor was removed
  // find the closest existent ancestor
  else {
    const closestAncestorIndex = state.cursor.findIndex((id, i) => {
      const ancestorPath = state.cursor!.slice(0, i + 1) as Path
      const thought = pathToThought(state, ancestorPath)
      return !thought || thought.parentId !== head(rootedParentOf(state, ancestorPath))
    })
    cursorNew = closestAncestorIndex > 0 ? (state.cursor.slice(0, closestAncestorIndex) as Path) : null
  }

  return cursorNew !== undefined
    ? {
        ...state,
        cursor: cursorNew,
      }
    : state
}

/** Creates a reducer spy that throws an error if any data integrity issues are found.
 * - No missing thought values.
 * - thought.parentId exists.
 * - child.parentId matches parent.children id.
 * - Each thought has a corresponding Lexeme.
 */
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
        .filter(nonNull)
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
    preventExpandThoughts,
    local = true,
    remote = true,
    idbSynced,
    isLoading,
    overwritePending,
    repairCursor,
  }: UpdateThoughtsOptions,
) => {
  if (Object.keys(thoughtIndexUpdates).length === 0 && Object.keys(lexemeIndexUpdates).length === 0) return state

  const thoughtIndexOld = { ...state.thoughts.thoughtIndex }
  const lexemeIndexOld = { ...state.thoughts.lexemeIndex }
  const lexemeIndexUpdatesOld = keyValueBy(lexemeIndexUpdates, key => ({ [key]: lexemeIndexOld[key] }))

  // TODO: Can we use { overwritePending: !local } and get rid of the overwritePending option to updateThoughts? i.e. Are there any false positives when local is false?
  const thoughtIndex = mergeUpdates(thoughtIndexOld, thoughtIndexUpdates, { overwritePending })
  const lexemeIndex = mergeUpdates(lexemeIndexOld, lexemeIndexUpdates, { overwritePending })

  const recentlyEditedNew = recentlyEdited || state.recentlyEdited

  // updates are queued, detected by the pushQueue middleware, and sync'd with the local and remote stores
  const batch: PushBatch = {
    idbSynced,
    lexemeIndexUpdates,
    lexemeIndexUpdatesOld,
    local,
    pendingDeletes,
    recentlyEdited: recentlyEditedNew,
    remote,
    thoughtIndexUpdates,
    updates,
  }

  /** Returns true if the thoughtspace is still loading because root thought is missing or pending and the tutorial is not running. */
  const isStillLoading = () => {
    // isLoading arg takes precedence
    if (isLoading != null) return isLoading

    // disable isLoading if tutorial is on
    if (getSetting(state, 'Tutorial') === 'On') return false

    const rootThought: Thought | null = thoughtIndexUpdates[HOME_TOKEN] || thoughtIndex[HOME_TOKEN]
    const isRootLoaded =
      rootThought &&
      !rootThought.pending &&
      // Disable isLoading if the root children have been loaded.
      // Otherwise EmptyThoughtspace will still be shown since there are no children to render.
      // If the root has no children and is no longer pending, we can disable isLoading immediately.
      (Object.keys(rootThought.childrenMap).length === 0 ||
        Object.values(rootThought.childrenMap).find(childId => thoughtIndex[childId]))
    return !isRootLoaded
  }

  return reducerFlow([
    // update recentlyEdited, pushQueue, and thoughts
    state => ({
      ...state,
      // disable loading screen as soon as the root is loaded
      // or isLoading can be forced by passing it directly to updateThoughts
      isLoading: state.isLoading && isStillLoading(),
      recentlyEdited: recentlyEditedNew,
      pushQueue: [...state.pushQueue, batch],
      thoughts: {
        thoughtIndex,
        lexemeIndex,
      },
    }),

    // Repair cursor
    // When getting updates from another device, the cursor may have moved or no longer exist, and needs to be updated.
    repairCursor ? repairCursorReducer : null,

    // expandThoughts
    state => {
      return {
        ...state,
        // calculate expanded using fresh thoughts and cursor
        ...(!preventExpandThoughts ? { expanded: expandThoughts(state, state.cursor) } : null),
      }
    },

    updateJumpHistory,

    // data integrity checks
    // immediately throws if any data integity issues are found
    // otherwise noop
    state => {
      dataIntegrityCheck(thoughtIndexUpdates, lexemeIndexUpdates)
      return state
    },
  ])(state)
}

/** Action-creator for updateThoughts. */
export const updateThoughtsActionCreator =
  (payload: Parameters<typeof updateThoughts>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'updateThoughts', ...payload })

export default _.curryRight(updateThoughts)
