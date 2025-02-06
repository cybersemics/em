import React, { useLayoutEffect, useRef } from 'react'

type AnimatedCol1Props = {
  isTableView: boolean
  duration?: number
  children: React.ReactNode
}

/**
 * When table view is enabled, this component animates its children from a left-aligned
 * position to a right-aligned position by animating the transform. During the animation,
 * text-align is kept as left, and after the animation, transform is cleared and text-align is set to right.
 */
const AnimatedCol1 = ({ isTableView, duration = 300, children }: AnimatedCol1Props) => {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    // If table view is disabled, immediately set right alignment.
    if (!isTableView || !element.parentElement) {
      element.style.transition = ''
      element.style.transform = ''
      element.style.textAlign = 'right'
      return
    }

    const parent = element.parentElement

    // Ensure the element is inline-block so its width is measured correctly.
    element.style.display = 'inline-block'
    // Set initial alignment and clear any previous transforms.
    element.style.textAlign = 'left'
    element.style.transition = `transform ${duration}ms ease-out`
    element.style.transform = 'translateX(0)'

    // Force reflow to ensure the styles are applied.
    const initialWidth = element.offsetWidth
    const parentWidth = parent.offsetWidth

    // Calculate the offset needed for right alignment.
    const offset = parentWidth - initialWidth

    // Use setTimeout to trigger the animation on the next tick.
    setTimeout(() => {
      element.style.transform = `translateX(${offset}px)`
    }, 0)

    /**
     * Handles the end of the transition by resetting styles and removing the event listener.
     * Ensures that after the animation, `text-align` is set to right and `transform` is cleared.
     */
    const handleTransitionEnd = () => {
      element.style.transition = ''
      element.style.transform = ''
      element.style.textAlign = 'right'
      element.removeEventListener('transitionend', handleTransitionEnd)
    }

    element.addEventListener('transitionend', handleTransitionEnd)

    return () => {
      element.removeEventListener('transitionend', handleTransitionEnd)
    }
  }, [isTableView, duration])

  return <div ref={ref}>{children}</div>
}

export default AnimatedCol1
