import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { ABSOLUTE_TOKEN, EM_TOKEN, FREE_THOUGHTS_MARGIN, FREE_THOUGHT_JUMPS, HOME_TOKEN } from '../constants'
import { getAllChildren } from '../selectors/getChildren'
import getContexts from '../selectors/getContexts'
import getDescendantThoughtIds from '../selectors/getDescendantThoughtIds'
import getLexeme from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import thoughtToPath from '../selectors/thoughtToPath'
import freeThoughtsThresholdStore from '../stores/freeThoughtsThresholdStore'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import deleteThought from './deleteThought'

/** Returns the loaded thoughts that the undo and redo history needs in order to replay its patches, and their ancestors, since freeing a thought frees its descendants. */
const getHistoryThoughtIds = (state: State): Set<ThoughtId> => {
  const ids = new Set<ThoughtId>(
    [...state.undoPatches, ...state.redoPatches]
      .flatMap(patch => patch.ops)
      .flatMap(op => {
        const [, key, index, id, field] = op.path.split('/')
        return key !== 'thoughts'
          ? // The rest of the state refers to thoughts by Path, e.g. the cursor, the multicursors, and the expanded Paths, or by a list of Paths, e.g. the cursor history. A Path that a patch restores is invalid once one of its thoughts is freed.
            'value' in op
            ? [op.value].flat(2)
            : []
          : op.op === 'add' && !field
            ? // a whole add recreates the thought or Lexeme
              []
            : // Every other op needs its thought or Lexeme. An op nested in a freed one throws, and a remove of a freed one removes nothing, which leaves the reverse patch unable to recreate it.
              index === 'lexemeIndex'
              ? // a Lexeme is freed with the last of its loaded contexts
                [state.thoughts.lexemeIndex[id]?.contexts.find(cxid => getThoughtById(state, cxid))]
              : [
                  id,
                  // Replaying a move places each child of the parents that it moves between after its previous loaded sibling (see restoreMoveUpdatesFromThoughtUpdates in undoRedoEnhancer), so those parents keep all of their children.
                  ...(field === 'rank' || field === 'parentId'
                    ? getAllChildren(state, getThoughtById(state, id as ThoughtId)?.parentId ?? null)
                    : []),
                  ...(field === 'parentId' && 'value' in op ? getAllChildren(state, op.value) : []),
                ]
      })
      // only a loaded thought can be freed; this also drops the op values that are not thought ids
      .filter(id => getThoughtById(state, id)),
  )

  return new Set([...ids].flatMap<ThoughtId>(id => thoughtToPath(state, id)))
}

/** Find the next thought that can be safely deallocated. Deletes from the beginning of state.thoughts.thoughtIndex, which is efficient, deterministic, and approximates an LRU cache due to the javascript runtime adding new entries to the end of the thoughtIndex. */
const findDeletableThought = (
  state: State,
  {
    preserveSet,
    historySet,
  }: {
    /** Thoughts that are not freed, and neither are their children. */
    preserveSet: Set<ThoughtId>
    /** Thoughts that the undo and redo history needs, and their ancestors. Unlike preserved thoughts, their children can still be freed. */
    historySet: Set<ThoughtId>
  },
): Thought | null => {
  const allThoughts = Object.values(state.thoughts.thoughtIndex)

  /** Returns true if a thought is safe to deallocate. */
  const isDeletable = (thought: Thought) =>
    // do not delete any thought or child of a thought in the preserve set
    !preserveSet.has(thought.id) &&
    !preserveSet.has(thought.parentId) &&
    // do not delete a thought that the undo or redo history needs, or an ancestor of one
    !historySet.has(thought.id) &&
    // do not delete a thought with a missing parent
    state.thoughts.thoughtIndex[thought.parentId] &&
    // do not delete meta attributes, or their descendants
    !isAttribute(thought.value) &&
    !thoughtToPath(state, thought.parentId).some(id => isAttribute(state.thoughts.thoughtIndex[id]?.value))

  // start searching at the start index and wrap around the end of the array of thoughts
  let deletableThought: Thought | null = null
  for (let i = 0; i < allThoughts.length; i++) {
    const thought = allThoughts[i % allThoughts.length]
    if (isDeletable(thought)) {
      deletableThought = thought
      break
    }
  }

  return deletableThought
}

/** Frees a block of thoughts that are not visible from memory when the memory limit is exceeded. May not free any thoughts if all thoughts are expanded or needed by the undo and redo history. */
const freeThoughts = (state: State): State => {
  const preserveSet = new Set<ThoughtId>([
    ABSOLUTE_TOKEN,
    EM_TOKEN,
    HOME_TOKEN,
    // drag-and-drop related thoughts
    ...(state.draggedSimplePath ?? []),
    ...(state.draggingThoughts.flat() as ThoughtId[]),
    ...(state.hoveringPath ?? []),
    // preserve the last few jump history points
    ...state.jumpHistory.slice(0, FREE_THOUGHT_JUMPS).flatMap(path => path || []),
    ...(state.importThoughtPath ?? []),
    // preserve expanded thoughts and their children
    ...Object.values(state.expanded).flatMap(path => {
      const showContexts = isContextViewActive(state, path)
      const thought = getThoughtById(state, head(path))

      return [
        ...path,
        // preserve normal children even if context view is active, so that it is instantly available when the user switches back
        ...getAllChildren(state, head(path)),
        // preserve context childern
        // preserve context ancestors
        // See test "Do not deallocate tangential contexts children" for an example of why context children need to be preserved
        ...(showContexts && thought
          ? getContexts(state, thought.value).flatMap(cxid => [
              ...getAllChildren(state, cxid),
              ...thoughtToPath(state, cxid),
            ])
          : []),
      ]
    }),
    // preserve EM context
    ...getDescendantThoughtIds(state, EM_TOKEN),
    // preserve favorites contexts and their ancestors
    ...((getLexeme(state, '=favorite')?.contexts || []).flatMap(cxid => thoughtToPath(state, cxid)) as ThoughtId[]),
  ])
  const historySet = getHistoryThoughtIds(state)

  // iterate over the entire thoughtIndex, deleting thoughts that are no longer visible
  let stateNew = state

  // free thoughts until MAX_THOUGHTS is reached (minus MAX_THOUGHTS_MARGIN to provide some slack)
  while (
    Object.values(stateNew.thoughts.thoughtIndex).length >
    freeThoughtsThresholdStore.getState() - FREE_THOUGHTS_MARGIN
  ) {
    // find a thought that can be deleted
    const deletableThought = findDeletableThought(stateNew, { preserveSet, historySet })
    // If all thoughts are preserved, we should bail.
    // This happens when the visible thoughts, together with the thoughts that the undo and redo history needs, exceed the threshold.
    // In the worst case, this results in continuous attempts for as long as they do, but will be throttled by the freeThoughts middleware.
    if (!deletableThought) break

    // delete the thought and all descendants to ensure thoughtIndex is still in integrity
    stateNew = deleteThought(stateNew, {
      thoughtId: deletableThought.id,
      pathParent: thoughtToPath(stateNew, deletableThought.parentId),
      // Do not persist deletions; only free cached state/provider entries.
      local: false,
      remote: false,
    })
  }

  return stateNew
}

/** Action-creator for freeThoughts. */
export const freeThoughtsActionCreator = (): Thunk => dispatch => dispatch({ type: 'freeThoughts' })

export default freeThoughts

// Register this action's metadata
registerActionMetadata('freeThoughts', {
  undoable: false,
})
