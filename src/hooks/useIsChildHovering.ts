import { useSelector } from 'react-redux'
import { Context } from '../types'
import { State } from '../util/initialState'

/**
 * Returns if any child is being hovered on.
 */
const useIsChildHovering = (thoughts: Context, isHovering: boolean, isDeepHovering: boolean) => {
  /* The motivation for this custom hook is to prevent rendering Thought component each time state.hoveringThought changes.
    Thought component needs to be reactive to the change of hoveringThought but only rerender when calculated value of isChildHovering changes.
    So instead of passing it through mapStateToProps which will re-render component everytime, instead use custom hook that will react to the changes.
  */
  const hoveringThought = useSelector((state: State) => state.hoveringThought)
  return isDeepHovering && !isHovering && hoveringThought
  && thoughts.length === hoveringThought.length
  && hoveringThought.every((thought: string, index: number) => thought === thoughts[index])
}

export default useIsChildHovering
