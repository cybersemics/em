import { ReactElement, cloneElement, useLayoutEffect, useRef, useState } from 'react'
import { TreeNodeAnimationContext } from './TreeNodeAnimationContext'

interface TreeNodeAnimationProviderProps {
  children: ReactElement
  y: number
  transitionGroupsProps?: object
}

/**
 * TreeNodeAnimationProvider component to provide animation context to its children.
 *
 * @param props - The props for the provider.
 * @param props.children - The children components.
 * @param props.y - The initial y value.
 * @param [props.transitionGroupsProps] - Additional props to pass to the children.
 * @returns The provider component.
 */
const TreeNodeAnimationProvider = ({
  children,
  y: _y,
  ...transitionGroupsProps
}: TreeNodeAnimationProviderProps): ReactElement => {
  const isAnimatingRef = useRef(false)
  const [y, setY] = useState(0)
  const nodeRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const currentNode = nodeRef.current
    /**
     * Handle the transition end event.
     */
    const handleTransitionEnd = () => {
      // Mark as animation done after the transition ends
      requestAnimationFrame(() => {
        isAnimatingRef.current = false
      })
    }

    if (currentNode) {
      currentNode.addEventListener('transitionend', handleTransitionEnd)
    }

    if (y !== _y) {
      // Mark as animating
      isAnimatingRef.current = true
      // When y changes React re-renders the component with the new value of y. It will result in a visual change in the DOM.
      // Because this is a state-driven change, React applies the updated value to the DOM, which causes the browser to recognize that
      // a CSS property has changed, thereby triggering the CSS transition.
      // Without this additional render, updates get batched and subsequent CSS transitions may not work properly. For example, when moving a thought down, it would not animate.
      setY(_y)
    }

    return () => {
      if (currentNode) {
        currentNode.removeEventListener('transitionend', handleTransitionEnd)
      }
    }
  }, [y, _y])

  return (
    <TreeNodeAnimationContext.Provider value={{ isAnimating: isAnimatingRef.current, y }}>
      {cloneElement(children, { ...transitionGroupsProps, ref: nodeRef })}
    </TreeNodeAnimationContext.Provider>
  )
}

export default TreeNodeAnimationProvider
