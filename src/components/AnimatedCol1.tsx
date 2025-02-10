import React, { useLayoutEffect, useRef, useState } from 'react'

type AnimatedCol1Props = {
  /** Determines if the Table View animation is active. */
  isTableView: boolean
  /** Duration of the animation in milliseconds. Defaults to 1000ms. */
  duration?: number
  /** The children components to render inside the animated column. */
  children: React.ReactElement
}

/** Animates text alignment from left to right using transform with calculated translateX value. */
const AnimatedCol1: React.FC<AnimatedCol1Props> = ({ isTableView, duration = 1000, children }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [translateX, setTranslateX] = useState(0)

  useLayoutEffect(() => {
    if (isTableView && ref.current && ref.current.parentElement) {
      const parentWidth = ref.current.parentElement.getBoundingClientRect().width
      const editable = ref.current.querySelector('.editable') as HTMLElement | null

      // Use a Document Range to measure only the text content
      if (editable?.firstChild) {
        const range = document.createRange()
        range.selectNodeContents(editable)
        const rect = range.getBoundingClientRect()
        const textWidth = rect.width

        // Shift the text so that it goes from left-aligned to right-aligned
        setTranslateX(parentWidth - textWidth)
      }
    }
  }, [isTableView])

  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        transform: isTableView ? `translateX(${translateX}px)` : `translateX(0)`,
        transition: `transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  )
}

export default AnimatedCol1
