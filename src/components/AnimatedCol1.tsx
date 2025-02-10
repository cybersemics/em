import React, { useLayoutEffect, useRef, useState } from 'react'

type AnimatedCol1Props = {
  /** Determines if the Table View animation is active. */
  isTableView: boolean

  /** Duration of the animation in milliseconds. Defaults to 2000ms. */
  duration?: number

  /** The children components to render inside the animated column. */
  children: React.ReactElement
}

/** Animates text alignment from left to right using transform with calculated translateX value. */
const AnimatedCol1: React.FC<AnimatedCol1Props> = ({ isTableView, duration = 2000, children }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [translateX, setTranslateX] = useState(0)

  useLayoutEffect(() => {
    if (ref.current && ref.current.parentElement) {
      const parent = ref.current.parentElement
      const parentWidth = parent.offsetWidth
      const editable = ref.current.querySelector('.editable')

      let textWidth = 0
      if (editable?.firstChild) {
        const range = document.createRange()
        range.selectNodeContents(editable.firstChild)
        textWidth = range.getBoundingClientRect().width
      }

      setTranslateX(parentWidth - textWidth)
    }
  }, [isTableView])

  return (
    <div
      ref={ref}
      style={{
        display: 'inline-block',
        transform: isTableView ? `translateX(${translateX}px)` : 'translateX(0)',
        transition: `transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  )
}

export default AnimatedCol1
