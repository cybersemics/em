import React, { useLayoutEffect, useRef, useState } from 'react'
import { CSSTransition } from 'react-transition-group'

type AnimatedCol1Props = {
  /** Determines if the Table View animation is active. */
  isTableView: boolean
  /** Duration of the animation in milliseconds. Defaults to 1000ms. */
  duration?: number
  /** The children components to render inside the animated column. */
  children: React.ReactElement
}

/** Animate the column to the right when the Table View is active. */
const AnimatedCol1: React.FC<AnimatedCol1Props> = ({ isTableView, duration = 500, children }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [translateX, setTranslateX] = useState(0)
  const [textAlignState, setTextAlignState] = useState<'right' | undefined>(undefined)

  const transitionStyle = isTableView
    ? { transform: `translateX(${translateX}px)`, transition: `transform ${duration}ms ease-out` }
    : {}

  useLayoutEffect(() => {
    if (isTableView && ref.current) {
      const parentWidth = ref.current.getBoundingClientRect().width
      const editable = ref.current.querySelector('.editable') as HTMLElement | null
      if (editable?.firstChild) {
        const range = document.createRange()
        range.selectNodeContents(editable)
        const rect = range.getBoundingClientRect()
        const textWidth = rect.width
        setTranslateX(parentWidth - textWidth)
      }
    } else {
      setTranslateX(0)
    }
  }, [isTableView])

  return (
    <CSSTransition
      in={isTableView}
      timeout={duration}
      nodeRef={ref}
      exit={false}
      onEnter={() => {
        setTextAlignState('right')
      }}
      onExited={() => {
        setTextAlignState(undefined)
      }}
    >
      <div
        ref={ref}
        style={{
          display: 'inline-flex',
          ...transitionStyle, // Apply transform conditionally
          textAlign: textAlignState,
          width: '100%',
        }}
      >
        {children}
      </div>
    </CSSTransition>
  )
}

export default AnimatedCol1
