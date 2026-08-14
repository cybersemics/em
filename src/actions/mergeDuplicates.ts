import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { getAllChildrenSorted } from '../selectors/getChildren'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import normalizeThought from '../util/normalizeThought'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import mergeThoughts from './mergeThoughts'

/** Merges all duplicate siblings at the same level as the cursor. The first duplicate of each value is kept and the children of the others are moved into it. */
const mergeDuplicates = (state: State): State => {
  const { cursor } = state

  if (!cursor) return state

  const simplePath = simplifyPath(state, cursor)
  const parentPath = parentOf(simplePath)
  const children = getAllChildrenSorted(state, head(rootedParentOf(state, simplePath)))

  // Do not treat empty thoughts as duplicates, consistent with moveThought. An empty thought is a placeholder with no
  // identity, so merging it into an existing empty sibling would silently drop it.
  // See https://github.com/cybersemics/em/issues/4448.
  const duplicateGroups = Object.values(
    _.groupBy(
      children.filter(child => child.value !== ''),
      child => normalizeThought(child.value),
    ),
  ).filter(group => group.length > 1)

  return reducerFlow(
    duplicateGroups.flatMap(([target, ...duplicates]) =>
      duplicates.map(
        duplicate => (stateNew: State) =>
          mergeThoughts(stateNew, {
            sourceThoughtPath: appendToPath(parentPath, duplicate.id),
            targetThoughtPath: appendToPath(parentPath, target.id),
          }),
      ),
    ),
  )(state)
}

/** Action-creator for mergeDuplicates. */
export const mergeDuplicatesActionCreator = (): Thunk => dispatch => dispatch({ type: 'mergeDuplicates' })

export default mergeDuplicates

// Register this action's metadata
registerActionMetadata('mergeDuplicates', {
  undoable: true,
})
