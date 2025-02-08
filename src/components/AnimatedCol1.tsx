import React, { useEffect, useRef } from 'react'
import { CSSTransition } from 'react-transition-group'

type AnimatedCol1Props = {
  /** Determines if the Table View animation is active. */
  isTableView: boolean

  /** Duration of the animation in milliseconds. Defaults to 5000ms. */
  duration?: number

  /** The children components to render inside the animated column. */
  children: React.ReactElement
}

/** A React component that animates its children by transitioning them horizontally. */
const AnimatedCol1: React.FC<AnimatedCol1Props> = ({ isTableView, duration = 5000, children }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.transition = `transform ${duration}ms ease-out`
      ref.current.style.transform = isTableView ? 'translateX(100%)' : 'translateX(0)'
    }
  }, [isTableView, duration])

  return (
    <CSSTransition in={isTableView} timeout={duration} nodeRef={ref}>
      <div
        ref={ref}
        style={{
          display: 'inline-block',
          transition: `transform ${duration}ms ease-out`,
          transform: isTableView ? 'translateX(100%)' : 'translateX(0)',
        }}
      >
        {children}
      </div>
    </CSSTransition>
  )
}

export default AnimatedCol1
