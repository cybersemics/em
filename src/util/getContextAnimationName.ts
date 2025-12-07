import Path from '../@types/Path'
import State from '../@types/State'
import isContextViewActive from '../selectors/isContextViewActive'
import isDescendantPath from './isDescendantPath'

/** Return an animation name for a thought that is appearing or disappearing as a result of toggling a context view.
 * This is used to display the animation in TreeNode, and also to determine whether thought annotations should delay
 * their position calculation until after the animation has completed (#3352).
 */
const getContextAnimationName = (path: Path, isAppearing?: boolean) => (state: State) => {
  const isLastActionContextView = state.undoPatches[state.undoPatches.length - 1]?.some(
    patch => patch.actions[0] === 'toggleContextView',
  )
  if (!isLastActionContextView) return null

  // Determine the animation direction for disappearing text
  let animation: 'disappearingLowerLeft' | 'disappearingUpperRight' = 'disappearingLowerLeft'

  if (isDescendantPath(path, state.cursor)) {
    const isCursorInContextView = isLastActionContextView && !!state.cursor && isContextViewActive(state, state.cursor)

    if (isCursorInContextView) {
      // Context View ON
      // New contextual child appearing (fade IN from RIGHT)
      // Old original child disappearing (fade OUT to LEFT)
      animation = isAppearing ? 'disappearingUpperRight' : 'disappearingLowerLeft'
    } else {
      // Context View OFF
      // Original child re-appearing (fade IN from LEFT)
      // Contextual child disappearing (fade OUT to RIGHT)
      animation = isAppearing ? 'disappearingLowerLeft' : 'disappearingUpperRight'
    }
  }

  return animation
}

export default getContextAnimationName
