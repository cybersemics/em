import React, { useCallback, useEffect, useState } from 'react'

const defaultOptions = {
  dismissThreshold: '50%',
  dx: 0,
  snapbackDuration: 0.1,
  snapbackEasing: 'ease-out',
}

/** Custom hook to manage swipe to dismiss alerts. */
const useSwipeToDismiss = (
  options: {
    // y offset at which onDismiss is fired, in px or % (of height)
    dismissThreshold?: string | number

    // x offset override
    // not used in this hook, but can be passed in to adjust the x position, otherwise transform will override it
    dx?: string

    // dismiss handler
    onDismiss?: () => void

    // dismiss after animating element off screen
    onDismissEnd?: () => void

    // time in seconds to animate the element back into place after releasing
    snapbackDuration?: number

    // easing function to animate the element back into place after releasing
    snapbackEasing?: string
  } = {},
) => {
  // initialize default options
  const { dismissThreshold, dx, onDismiss, onDismissEnd, snapbackDuration, snapbackEasing } = {
    ...defaultOptions,
    ...options,
  }

  // set dismiss threshold based on height
  const [height, setHeight] = useState<number>(0)

  // track y position at start of drag
  const [y0, setY0] = useState<number>(0)

  // track change in y position during drag
  const [dy, setDY] = useState<number>(0)

  // enable animation during snapback
  const [animate, setAnimate] = useState<boolean>(false)

  // calculate height on mount
  const ref = React.createRef<HTMLDivElement>()
  useEffect(() => {
    if (!ref.current) return
    setHeight(ref.current.offsetHeight)
  }, [ref, setHeight])

  const start = useCallback((e: React.TouchEvent) => {
    // do not animate during drag so that element tracks touch exactly
    setAnimate(false)
    setY0(e.touches?.[0].pageY)
  }, [])

  const stop = useCallback(
    (e: React.TouchEvent) => {
      // preventDefault on touchEnd to prevent ToolbarIcon click
      if (!(e.target as HTMLElement).classList.contains('no-swipe-to-dismiss')) {
        e.preventDefault()
      }

      // animate on release for snapback animation
      setAnimate(true)

      // check for dismiss threshold
      // if specified as a percentage of height, use percentage of element height
      const isPercentageOfHeight = typeof dismissThreshold === 'string' && dismissThreshold.endsWith('%')
      const dismissThresholdPx = isPercentageOfHeight
        ? (-parseFloat(dismissThreshold as string) * height) / 100
        : -parseFloat(dismissThreshold as string)

      if (dy < dismissThresholdPx) {
        setDY(-height * 2)
        onDismiss?.()
        setTimeout(() => {
          onDismissEnd?.()
        }, snapbackDuration * 1000)
      } else {
        setDY(0)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dy, height],
  )

  const move = useCallback(
    (e: React.TouchEvent) => {
      // move element to track touch
      const y = e.touches?.[0].pageY
      const dy = y - y0

      // resist dragging down by taking the square root of positive dy
      const dyResistant = dy < 0 ? dy : Math.sqrt(dy)
      setDY(dyResistant)
    },
    [y0],
  )

  return {
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchMove: move,
    onTouchCancel: stop,
    ref,
    style: {
      transform: `translate(${dx}, ${dy}px)`,
      transition: animate ? `transform ${snapbackDuration}s ${snapbackEasing}` : '',
      touchAction: 'none',
    },
  }
}

export default useSwipeToDismiss
