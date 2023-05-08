import State from '../@types/State'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, MAX_THOUGHT_INDEX } from '../constants'
import { getAllChildren } from '../selectors/getChildren'
import getDescendantThoughtIds from '../selectors/getDescendantThoughtIds'
import thoughtToPath from '../selectors/thoughtToPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import deleteThought from './deleteThought'

/** Frees thoughts from memory that have exceeded the memory limit. Note: May not free any thoughts if all thoughts are expanded. */
const freeThoughts = (state: State) => {
  const expandedIds = Object.values(state.expanded).map(head)
  const preserveSet = new Set([
    ABSOLUTE_TOKEN,
    EM_TOKEN,
    HOME_TOKEN,
    ...expandedIds.flatMap(id => [id, ...getAllChildren(state, id)]),
    ...getDescendantThoughtIds(state, EM_TOKEN),
  ])

  // iterate over the entire thoughtIndex, deleting thoughts that are no longer visible
  let stateNew = state

  // all thoughts will be updated after each deletion
  let allThoughts = Object.values(state.thoughts.thoughtIndex)

  // eslint-disable-next-line fp/no-loops
  while (allThoughts.length > MAX_THOUGHT_INDEX) {
    // find a thought that can be deleted
    const markedThought = allThoughts.find(
      thought =>
        // do not delete any thought or child of a thought in the preserve set
        !preserveSet.has(thought.id) &&
        !preserveSet.has(thought.parentId) &&
        // do not delete a thought with a missing parent
        state.thoughts.thoughtIndex[thought.parentId] &&
        // do not delete meta attributes, or their descendants
        !isAttribute(thought.value) &&
        !thoughtToPath(state, thought.parentId).some(id => isAttribute(state.thoughts.thoughtIndex[id]?.value)),
    )

    // If all thoughts are preserved, we should bail.
    // This is unlikely to happen, as MAX_THOUGHT_INDEX should usually exceed the number of visible thoughts.
    // In the worst case, this results in continuous attempts until the user collapses some thoughts, but will be throttled by the freeThoughts middleware.
    if (!markedThought) break

    // delete the thought and all descendants to ensure thoughtIndex is still in integrity
    stateNew = deleteThought(stateNew, {
      thoughtId: markedThought.id,
      pathParent: thoughtToPath(state, markedThought.parentId),
      // do not persist deletions; just delete from state
      local: false,
      remote: false,
      // prevent thought from being removed from parent
      orphaned: true,
    })

    // set parent to pending to allow thoughts to be reloaded if they become visible again
    const parentThought = stateNew.thoughts.thoughtIndex[markedThought.parentId]
    stateNew = {
      ...stateNew,
      thoughts: {
        ...stateNew.thoughts,
        thoughtIndex: {
          ...stateNew.thoughts.thoughtIndex,
          [markedThought.parentId]: {
            ...parentThought,
            pending: true,
          },
        },
      },
    }

    // we do not know how many thoughts were deleted
    allThoughts = Object.values(stateNew.thoughts.thoughtIndex)
  }

  return stateNew
}

export default freeThoughts
