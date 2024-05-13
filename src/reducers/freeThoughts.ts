import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import {
  ABSOLUTE_TOKEN,
  EM_TOKEN,
  FREE_THOUGHTS_MARGIN,
  FREE_THOUGHTS_THRESHOLD,
  FREE_THOUGHT_JUMPS,
  HOME_TOKEN,
} from '../constants'
import globals from '../globals'
import { getAllChildren } from '../selectors/getChildren'
import getContexts from '../selectors/getContexts'
import getDescendantThoughtIds from '../selectors/getDescendantThoughtIds'
import getLexeme from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import thoughtToPath from '../selectors/thoughtToPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import deleteThought from './deleteThought'

/** Find the next thought that can be safely deallocated. Deletes from the beginning of state.thoughts.thoughtIndex, which is efficient, deterministic, and approximates an LRU cache due to the javascript runtime adding new entries to the end of the thoughtIndex. */
const findDeletableThought = (state: State, preserveSet: Set<ThoughtId>): Thought | null => {
  const allThoughts = Object.values(state.thoughts.thoughtIndex)

  /** Returns true if a thought is safe to deallocate. */
  const isDeletable = (thought: Thought) =>
    // do not delete any thought or child of a thought in the preserve set
    !preserveSet.has(thought.id) &&
    !preserveSet.has(thought.parentId) &&
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

/** Frees a block of thoughts that are not visible from memory when the memory limit is exceeded. May not free any thoughts if all thoughts are expanded. */
const freeThoughts = (state: State) => {
  const preserveSet = new Set<ThoughtId>([
    ABSOLUTE_TOKEN,
    EM_TOKEN,
    HOME_TOKEN,
    // preserve the last few jump history points
    ...state.jumpHistory.slice(0, FREE_THOUGHT_JUMPS).flatMap(path => path || []),
    // a special back channel for import/export
    ...globals.preserveSet.keys(),
    // preserve expanded thoughts and their children
    ...Object.values(state.expanded).flatMap(path => {
      const showContexts = isContextViewActive(state, path)
      return [
        ...path,
        // preserve normal children even if context view is active, so that it is instantly available when the user switches back
        ...getAllChildren(state, head(path)),
        // preserve context view (including context ancestors)
        ...(showContexts
          ? getContexts(state, getThoughtById(state, head(path)).value).flatMap(cxid => thoughtToPath(state, cxid))
          : []),
      ]
    }),
    // preserve EM context
    ...getDescendantThoughtIds(state, EM_TOKEN),
    // preserve favorites contexts and their ancestors
    ...(getLexeme(state, '=favorite')?.contexts || []).flatMap(cxid => thoughtToPath(state, cxid)),
  ])

  // iterate over the entire thoughtIndex, deleting thoughts that are no longer visible
  let stateNew = state

  // free thoughts until MAX_THOUGHTS is reached (minus MAX_THOUGHTS_MARGIN to provide some slack)
  while (Object.values(stateNew.thoughts.thoughtIndex).length > FREE_THOUGHTS_THRESHOLD - FREE_THOUGHTS_MARGIN) {
    // find a thought that can be deleted
    const deletableThought = findDeletableThought(stateNew, preserveSet)
    // If all thoughts are preserved, we should bail.
    // This is unlikely to happen, as MAX_THOUGHT_INDEX should usually exceed the number of visible thoughts.
    // In the worst case, this results in continuous attempts until the user collapses some thoughts, but will be throttled by the freeThoughts middleware.
    if (!deletableThought) break

    // delete the thought and all descendants to ensure thoughtIndex is still in integrity
    stateNew = deleteThought(stateNew, {
      thoughtId: deletableThought.id,
      pathParent: thoughtToPath(stateNew, deletableThought.parentId),
      // Do not persist deletions; just delete from Redux state.
      // The pushQueue will enhancer will detect this batch and deallocate YJS providers.
      local: false,
      remote: false,
    })
  }

  return stateNew
}

/** Action-creator for freeThoughts. */
export const freeThoughtsActionCreator = (): Thunk => dispatch => dispatch({ type: 'freeThoughts' })

export default freeThoughts
