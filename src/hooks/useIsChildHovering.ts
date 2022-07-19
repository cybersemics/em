import { useSelector } from 'react-redux'
import Path from '../@types/Path'
import State from '../@types/State'
import equalPath from '../util/equalPath'

/**
 * Returns if any child is being hovered on.
 */
const useIsChildHovering = (path: Path, isHovering: boolean, isDeepHovering: boolean): boolean => {
  /* The motivation for this custom hook is to prevent rendering Thought component each time state.hoveringThought changes.
    Thought component needs to be reactive to the change of hoveringThought but only rerender when calculated value of isChildHovering changes. So instead of passing it through mapStateToProps which will re-render component everytime, instead use custom hook that will react to the changes.
  */
  return useSelector((state: State) => isDeepHovering && !isHovering && equalPath(path, state.hoveringPath))
}

export default useIsChildHovering
