import { useSelector } from 'react-redux'
import { Context, State } from '../types'
import { pathToContext } from '../util'

/**
 * Returns if any child is being hovered on.
 */
const useIsChildHovering = (context: Context, isHovering: boolean, isDeepHovering: boolean) => {
  /* The motivation for this custom hook is to prevent rendering Thought component each time state.hoveringThought changes.
    Thought component needs to be reactive to the change of hoveringThought but only rerender when calculated value of isChildHovering changes.
    So instead of passing it through mapStateToProps which will re-render component everytime, instead use custom hook that will react to the changes.
  */
  const hoveringPath = useSelector((state: State) => state.hoveringPath)
  const hoveringThought = hoveringPath && pathToContext(hoveringPath)
  return (
    isDeepHovering &&
    !isHovering &&
    hoveringThought &&
    context.length === hoveringThought.length &&
    hoveringThought.every((value: string, index: number) => value === context[index])
  )
}

export default useIsChildHovering
