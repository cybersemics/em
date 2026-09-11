import { MotionValue, animate, useMotionValue } from 'motion/react'
import { RefObject, useEffect, useLayoutEffect, useRef } from 'react'
import visibleScrollRange from '../util/visibleScrollRange'

const MAX_ELASTIC_OFFSET = 80

/** Applies increasing resistance to an attempted scroll beyond a logical edge. */
const resistOverscroll = (distance: number): number =>
  Math.sign(distance) * MAX_ELASTIC_OFFSET * (1 - Math.exp(-Math.abs(distance) / MAX_ELASTIC_OFFSET))

/** Clamps native window scrolling to the visible thoughts and returns a temporary elastic y offset for touch overscroll. */
const useScrollClamp = ({
  layoutRef,
  visibleTop,
  visibleBottom,
  viewportHeight,
  enabled,
}: {
  /** Layout tree element whose offset anchors positioned thought y values in the document. */
  layoutRef: RefObject<HTMLElement | null>
  /** Layout-relative y of the first visible thought. */
  visibleTop: number
  /** Layout-relative y of the bottom edge of the last visible thought. */
  visibleBottom: number
  /** Viewport height in pixels. */
  viewportHeight: number
  /** Whether autofocus has left hidden ancestor space that needs a logical clamp. */
  enabled: boolean
}): MotionValue<number> => {
  const elasticOffset = useMotionValue(0)
  const rangeRef = useRef({ minScroll: -Infinity, maxScroll: Infinity })
  const touchActiveRef = useRef(false)
  const rejectedDistanceRef = useRef(0)
  const correctionTargetRef = useRef<number | null>(null)
  const springRef = useRef<ReturnType<typeof animate> | null>(null)

  useEffect(
    () =>
      elasticOffset.on('change', value => {
        if (layoutRef.current) layoutRef.current.style.transform = `translateY(${value}px)`
      }),
    [elasticOffset, layoutRef],
  )

  // The full document must remain laid out before its physical scroll range and the layout origin can be measured.
  useLayoutEffect(() => {
    if (!enabled) {
      rangeRef.current = { minScroll: -Infinity, maxScroll: Infinity }
      correctionTargetRef.current = null
      rejectedDistanceRef.current = 0
      springRef.current?.stop()
      if (elasticOffset.get() !== 0) elasticOffset.set(0)
      return
    }

    const originY = layoutRef.current?.offsetTop
    if (originY == null) return

    const toolbarBottom = document.getElementById('toolbar')?.getBoundingClientRect().bottom ?? 0
    rangeRef.current = visibleScrollRange({
      visibleTop: originY + visibleTop,
      visibleBottom: originY + visibleBottom,
      viewportHeight,
      topInset: toolbarBottom,
      slackY: viewportHeight * 0.01,
      documentHeight: document.documentElement.scrollHeight,
    })
    correctionTargetRef.current = null
  })

  useEffect(() => {
    /** Springs the visual overscroll offset back to the native scroll position. */
    const releaseElasticOffset = () => {
      touchActiveRef.current = false
      rejectedDistanceRef.current = 0
      if (elasticOffset.get() === 0) return
      springRef.current?.stop()
      springRef.current = animate(elasticOffset, 0, {
        type: 'spring',
        stiffness: 500,
        damping: 40,
      })
    }

    /** Marks the beginning of a native touch scroll. */
    const onTouchStart = () => {
      touchActiveRef.current = true
      rejectedDistanceRef.current = 0
      if (elasticOffset.get() !== 0) {
        springRef.current?.stop()
        elasticOffset.set(0)
      }
    }

    /** Constrains the native scroll position and adds resistance while a touch presses against an edge. */
    const onScroll = () => {
      const { minScroll, maxScroll } = rangeRef.current
      const scrollY = window.scrollY

      if (correctionTargetRef.current === scrollY) {
        correctionTargetRef.current = null
        return
      }
      correctionTargetRef.current = null

      const scrollYClamped = Math.min(maxScroll, Math.max(minScroll, scrollY))
      const footerTop = document.querySelector('[aria-label="footer"]')?.getBoundingClientRect().top
      const scrollingToFooter = scrollY > maxScroll && footerTop != null && footerTop < viewportHeight

      if (scrollYClamped === scrollY || scrollingToFooter) {
        if (touchActiveRef.current && rejectedDistanceRef.current !== 0) {
          rejectedDistanceRef.current = 0
          elasticOffset.set(0)
        }
        return
      }

      if (touchActiveRef.current) {
        rejectedDistanceRef.current += scrollYClamped - scrollY
        elasticOffset.set(resistOverscroll(rejectedDistanceRef.current))
      }

      correctionTargetRef.current = scrollYClamped
      window.scrollTo({ top: scrollYClamped })
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', releaseElasticOffset, { passive: true })
    window.addEventListener('touchcancel', releaseElasticOffset, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      springRef.current?.stop()
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', releaseElasticOffset)
      window.removeEventListener('touchcancel', releaseElasticOffset)
      window.removeEventListener('scroll', onScroll)
    }
  }, [elasticOffset, viewportHeight])

  return elasticOffset
}

export default useScrollClamp
