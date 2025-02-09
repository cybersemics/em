import React from 'react'

type AnimatedCol1Props = {
  /** Determines if the Table View animation is active. */
  isTableView: boolean

  /** Duration of the animation in milliseconds. Defaults to 2000ms. */
  duration?: number

  /** The children components to render inside the animated column. */
  children: React.ReactElement
}

/**
 * When table view is enabled, this component animates its children from a left-aligned
 * position to a right-aligned position by animating the transform.
 */
const AnimatedCol1: React.FC<AnimatedCol1Props> = ({ isTableView, duration = 2000, children }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        transform: isTableView ? 'translateX(100%)' : 'translateX(0)',
        transition: `transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  )
}

export default AnimatedCol1
