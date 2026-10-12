import { AnimationPlaybackControls, animate } from 'motion/react'
import { RefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { WebviewBackground } from 'webview-background'
import TreeThoughtPositioned from '../@types/TreeThoughtPositioned'
import { isIOS, isMac } from '../browser'

// iPadOS can identify itself as a Mac in Safari's desktop browsing mode.
const hasElasticOverscroll =
  isIOS || /iP(ad|hone|od)/.test(navigator.userAgent) || (isMac && navigator.maxTouchPoints > 1)

// The observed UIScrollView rubber-band curve, with distance normalized by viewport height.
// https://holko.pl/2014/07/06/inertia-bouncing-rubber-banding-uikit-dynamics/
const RUBBER_BAND_COEFFICIENT = 0.55
// A critically damped 2 Hz spring approximates UIKit's return without oscillating across the boundary.
// UIKit's exact bounce parameters are private; these are not claimed to be its implementation.
const SPRING_FREQUENCY = 2 * Math.PI * 2
const SPRING_STIFFNESS = SPRING_FREQUENCY ** 2
const SPRING_DAMPING = 2 * SPRING_FREQUENCY
// UIScrollView.DecelerationRate.normal decays velocity by 0.998 per millisecond.
const DECELERATION_TIME_CONSTANT = -1 / Math.log(0.998)
const LAYOUT_TREE_ELASTIC_OFFSET = '--layout-tree-elastic-offset'

/** Clamps native window scrolling to the vertical band of autofocus-visible thoughts. */
const useClampScrollToVisibleThoughts = ({
  ref,
  viewportHeight,
  treeThoughtsPositioned,
}: {
  /** The layout container that receives the temporary elastic transform. */
  ref: RefObject<HTMLElement | null>
  /** The viewport height, including any space occupied by the virtual keyboard. */
  viewportHeight: number
  /** Positioned thoughts whose autofocus states determine the scrollable band. */
  treeThoughtsPositioned: TreeThoughtPositioned[]
}) => {
  const visibleThoughtExtrema = useMemo(
    () =>
      treeThoughtsPositioned.reduce<{ top: number; bottom: number } | null>((accum, thought) => {
        if (thought.autofocus !== 'show' && thought.autofocus !== 'dim') return accum
        const bottom = thought.y + thought.height
        return !accum
          ? { top: thought.y, bottom }
          : {
              top: Math.min(accum.top, thought.y),
              bottom: Math.max(accum.bottom, bottom),
            }
      }, null),
    [treeThoughtsPositioned],
  )

  const touchInProgress = useRef(false)
  const touchMoved = useRef(false)
  const touchStartScrollY = useRef(window.scrollY)
  const animationControls = useRef<AnimationPlaybackControls | null>(null)
  const animationScrollY = useRef(window.scrollY)
  const elasticOffset = useRef(0)
  const dragCarry = useRef(0)
  const momentumInProgress = useRef(false)
  const drag = useRef({
    startY: window.scrollY,
    startClientY: 0,
    clientY: 0,
    panOffset: null as number | null,
    suspended: false,
    pin: false,
  })
  const scrollSample = useRef({ y: window.scrollY, time: performance.now(), velocity: 0 })
  const visibleTop = visibleThoughtExtrema?.top
  const visibleBottom = visibleThoughtExtrema?.bottom

  const geometry = useRef({ viewportHeight, visibleTop, visibleBottom })
  const updateBounds = useRef<(() => void) | null>(null)

  // Updating geometry must not discard the finger or restart its gesture recognition.
  useLayoutEffect(() => {
    geometry.current = { viewportHeight, visibleTop, visibleBottom }
    updateBounds.current?.()
  }, [viewportHeight, visibleTop, visibleBottom])

  useEffect(() => {
    /** Applies a vertical offset without rerendering the thought list. */
    const setElasticOffset = (value: number) => {
      elasticOffset.current = value
      ref.current?.style.setProperty(LAYOUT_TREE_ELASTIC_OFFSET, `${value}px`)
    }

    /** Stops the animation at its current visible position. */
    const stopAnimation = () => {
      const controls = animationControls.current
      animationControls.current = null
      controls?.stop()
    }

    /** Converts unresisted finger travel into progressively resisted displacement. */
    const rubberBand = (distance: number) => {
      const { viewportHeight } = geometry.current
      return (
        (distance * viewportHeight * RUBBER_BAND_COEFFICIENT) / (viewportHeight + distance * RUBBER_BAND_COEFFICIENT)
      )
    }

    /** Returns the logical scroll position and visible bounds, limited to reachable document coordinates. */
    const getBounds = () => {
      const { viewportHeight, visibleTop, visibleBottom } = geometry.current
      if (visibleTop === undefined || visibleBottom === undefined) return null
      const y = touchInProgress.current
        ? (drag.current.panOffset === null
            ? window.scrollY
            : drag.current.startY + drag.current.startClientY - drag.current.clientY + drag.current.panOffset) +
          dragCarry.current
        : window.scrollY
      const nativeMax = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const layoutTreeTop = ref.current?.offsetTop || 0
      const toolbarBottom = document.getElementById('toolbar')?.getBoundingClientRect().bottom || 0
      const navHeight = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect().height || 0
      const footerRect = document.querySelector('[aria-label="footer"]')?.getBoundingClientRect()
      const viewportBottomBoundary = viewportHeight - navHeight
      const viewportUsableHeight = Math.max(1, viewportBottomBoundary - toolbarBottom)
      const viewportAllowance = viewportUsableHeight * 0.8
      const minScrollY = Math.min(
        nativeMax,
        Math.max(0, layoutTreeTop + visibleTop - (toolbarBottom + viewportAllowance)),
      )
      const visibleContentBottom = Math.max(
        layoutTreeTop + visibleBottom,
        footerRect ? footerRect.bottom + window.scrollY : 0,
      )
      const maxScrollY = Math.min(
        nativeMax,
        Math.max(minScrollY, visibleContentBottom - (viewportBottomBoundary - viewportAllowance)),
      )
      const clampedScrollY = Math.min(maxScrollY, Math.max(minScrollY, y))
      // The real page edges already use UIScrollView's bounce. Avoid applying resistance twice there.
      const nativeOverscroll =
        dragCarry.current === 0 && ((minScrollY === 0 && y < 0) || (maxScrollY === nativeMax && y > nativeMax))
      return { y, clampedScrollY, minScrollY, maxScrollY, nativeOverscroll }
    }

    /** Transfers position and velocity to a spring while cancelling native out-of-range scrolling. */
    const springBack = ({ offset, velocity, boundary }: { offset: number; velocity: number; boundary: number }) => {
      stopAnimation()
      // Request native cancellation at the handoff; iOS 27 preserves momentum across scrollTo.
      if (isIOS) WebviewBackground.stopScrollMomentum().catch(console.error)
      momentumInProgress.current = false
      setElasticOffset(offset)
      animationScrollY.current = boundary
      animationControls.current = animate(offset, 0, {
        type: 'spring',
        stiffness: SPRING_STIFFNESS,
        damping: SPRING_DAMPING,
        velocity,
        restDelta: 0.1,
        restSpeed: 1,
        onUpdate: setElasticOffset,
        onComplete: () => {
          animationControls.current = null
          setElasticOffset(0)
        },
      })
      window.scrollTo({ left: window.scrollX, top: boundary, behavior: 'instant' })
    }

    /** Clamps desktop/Android immediately, and hands iOS native momentum to the boundary spring. */
    const clampScroll = () => {
      if (touchInProgress.current && ((!touchMoved.current && drag.current.pin) || drag.current.suspended)) {
        // A newly placed, stationary finger stops any queued native momentum as well as our spring.
        if (Math.abs(window.scrollY - touchStartScrollY.current) >= 0.5) {
          window.scrollTo({ left: window.scrollX, top: touchStartScrollY.current, behavior: 'instant' })
        }
        return
      }
      if (animationControls.current && !touchInProgress.current) {
        // A queued native momentum frame can arrive after scrollTo. Keep it from moving the spring's anchor.
        if (Math.abs(window.scrollY - animationScrollY.current) >= 0.5) {
          window.scrollTo({ left: window.scrollX, top: animationScrollY.current, behavior: 'instant' })
        }
        return
      }
      if (touchInProgress.current && drag.current.panOffset === null && window.scrollY !== drag.current.startY) {
        // Preserve native pan-recognition slop, then use unresisted finger travel even past the physical page edge.
        drag.current.panOffset = window.scrollY - drag.current.startY - drag.current.startClientY + drag.current.clientY
      }
      const bounds = getBounds()
      if (!bounds) return
      const { y, clampedScrollY, nativeOverscroll } = bounds
      const rawOffset = clampedScrollY - y
      const now = performance.now()
      const elapsed = now - scrollSample.current.time
      const velocity = elapsed > 0 && elapsed < 80 ? ((y - scrollSample.current.y) / elapsed) * 1000 : 0
      momentumInProgress.current = momentumInProgress.current && elapsed < 80
      // A touchmove and its native scroll event can report the same position. Keep the last moving sample.
      if (y !== scrollSample.current.y) scrollSample.current = { y, time: now, velocity }

      if (hasElasticOverscroll && nativeOverscroll) {
        setElasticOffset(0)
        return
      }

      if (hasElasticOverscroll && touchInProgress.current) {
        const resisted = Math.sign(rawOffset) * rubberBand(Math.abs(rawOffset))
        setElasticOffset(rawOffset === 0 && dragCarry.current === 0 ? 0 : window.scrollY - clampedScrollY + resisted)
        return
      }

      if (Math.abs(rawOffset) >= 0.5) {
        if (hasElasticOverscroll && momentumInProgress.current) {
          // Momentum hits the edge at its current speed; applying the drag curve here would abruptly slow it down.
          springBack({ offset: rawOffset, velocity: -velocity, boundary: clampedScrollY })
        } else {
          window.scrollTo({ left: window.scrollX, top: clampedScrollY, behavior: 'instant' })
          setElasticOffset(0)
        }
      } else {
        setElasticOffset(0)
      }
    }

    /** Lets a new touch take over the current stretch without resetting it or inheriting spring velocity. */
    const onTouchStart = (event: TouchEvent) => {
      if (touchInProgress.current) {
        if (!drag.current.suspended && event.touches.length > 1) {
          drag.current.suspended = true
          touchStartScrollY.current = window.scrollY
        }
        return
      }
      const interrupted = animationControls.current !== null || momentumInProgress.current
      stopAnimation()
      touchInProgress.current = true
      touchMoved.current = false
      touchStartScrollY.current = window.scrollY
      momentumInProgress.current = false
      drag.current = {
        startY: window.scrollY,
        startClientY: event.touches[0].clientY,
        clientY: event.touches[0].clientY,
        panOffset: null,
        suspended: event.touches.length !== 1,
        pin: interrupted,
      }
      const { viewportHeight } = geometry.current
      const distance = Math.abs(elasticOffset.current)
      // Invert the drag curve so subsequent native scroll deltas continue from this exact visible position.
      dragCarry.current =
        (-Math.sign(elasticOffset.current) * distance * viewportHeight) /
        (RUBBER_BAND_COEFFICIENT * Math.max(1, viewportHeight - distance))
      scrollSample.current = { y: window.scrollY + dragCarry.current, time: performance.now(), velocity: 0 }
    }

    /** Distinguishes finger movement from a queued native momentum frame after interruption. */
    const onTouchMove = (event: TouchEvent) => {
      if (!drag.current.suspended && (event.defaultPrevented || event.touches.length !== 1)) {
        drag.current.suspended = true
        touchStartScrollY.current = window.scrollY
      }
      if (drag.current.suspended) return
      touchMoved.current = true
      drag.current.clientY = event.touches[0].clientY
      // Wait for native pan recognition so touches consumed by editor gestures never become scrolling.
      if (drag.current.panOffset !== null) clampScroll()
    }

    /** Gives deliberate navigation priority over elastic scrolling. */
    const onIntentionalScroll = () => {
      stopAnimation()
      touchInProgress.current = false
      momentumInProgress.current = false
      dragCarry.current = 0
      setElasticOffset(0)
    }

    /** Releases a drag into native momentum or a velocity-preserving return spring. */
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length > 0 || !touchInProgress.current) return
      const bounds = getBounds()
      if (!bounds) {
        touchInProgress.current = false
        return
      }
      const { y, clampedScrollY, nativeOverscroll } = bounds
      const rawOffset = clampedScrollY - y
      const carried = dragCarry.current !== 0
      const velocity =
        event.type !== 'touchcancel' && !drag.current.suspended && performance.now() - scrollSample.current.time < 80
          ? scrollSample.current.velocity
          : 0
      touchInProgress.current = false
      dragCarry.current = 0
      momentumInProgress.current = event.type !== 'touchcancel' && Math.abs(velocity) > 1

      if (nativeOverscroll) return
      if (Math.abs(rawOffset) >= 0.5) {
        const offset = Math.sign(rawOffset) * rubberBand(Math.abs(rawOffset))
        // The derivative of the resistance curve converts native scroll speed into visible content speed.
        const resistance =
          RUBBER_BAND_COEFFICIENT /
          (1 + (Math.abs(rawOffset) * RUBBER_BAND_COEFFICIENT) / geometry.current.viewportHeight) ** 2
        springBack({ offset, velocity: -velocity * resistance, boundary: clampedScrollY })
      } else if (carried) {
        // Take over native inertia explicitly; scrollTo alone no longer cancels it on iOS 27.
        if (isIOS) WebviewBackground.stopScrollMomentum().catch(console.error)
        // Continue the interrupted drag with the normal UIScrollView decay.
        setElasticOffset(0)
        window.scrollTo({ left: window.scrollX, top: clampedScrollY, behavior: 'instant' })
        animationScrollY.current = clampedScrollY
        const target = clampedScrollY + (velocity * DECELERATION_TIME_CONSTANT) / 1000
        const controls = animate(clampedScrollY, target, {
          type: 'inertia',
          velocity,
          power: DECELERATION_TIME_CONSTANT / 1000,
          timeConstant: DECELERATION_TIME_CONSTANT,
          restDelta: 0.1,
          restSpeed: 1,
          onUpdate: value => {
            // Motion may sample a final frame during stop(); cancellation must not launch a replacement spring.
            if (!animationControls.current) return
            const bounds = getBounds()
            if (!bounds) return
            const bounded = Math.min(bounds.maxScrollY, Math.max(bounds.minScrollY, value))
            if (bounded !== value) {
              // The exponential decay's exact derivative preserves speed when crossing a newly measured boundary.
              springBack({
                offset: bounded - value,
                velocity: -((target - value) * 1000) / DECELERATION_TIME_CONSTANT,
                boundary: bounded,
              })
              return
            }
            animationScrollY.current = bounded
            window.scrollTo({ left: window.scrollX, top: bounded, behavior: 'instant' })
          },
          onComplete: () => {
            // A final inertia frame can start a spring; only the current animation may clear it.
            if (animationControls.current !== controls) return
            animationControls.current = null
            momentumInProgress.current = false
            setElasticOffset(0)
          },
        })
        animationControls.current = controls
      } else {
        setElasticOffset(0)
      }
    }

    updateBounds.current = () => {
      const bounds = getBounds()
      // Inertia checks fresh bounds each frame. A return spring can also survive measurements while its anchor is valid.
      if (
        animationControls.current &&
        bounds &&
        (momentumInProgress.current ||
          (animationScrollY.current >= bounds.minScrollY && animationScrollY.current <= bounds.maxScrollY))
      )
        return
      // Measurements must not discard native coasting before it reaches a visible boundary.
      if (animationControls.current) momentumInProgress.current = false
      stopAnimation()
      if (!touchInProgress.current) setElasticOffset(0)
      clampScroll()
    }
    clampScroll()
    if (hasElasticOverscroll) {
      window.addEventListener('touchstart', onTouchStart, { passive: true })
      window.addEventListener('touchmove', onTouchMove, { passive: true })
      window.addEventListener('em-scroll', onIntentionalScroll)
      window.addEventListener('wheel', onIntentionalScroll, { passive: true })
      window.addEventListener('keydown', onIntentionalScroll)
      window.addEventListener('touchend', onTouchEnd, { passive: true })
      window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    }
    window.addEventListener('scroll', clampScroll, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('em-scroll', onIntentionalScroll)
      window.removeEventListener('wheel', onIntentionalScroll)
      window.removeEventListener('keydown', onIntentionalScroll)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('scroll', clampScroll)
      updateBounds.current = null
      stopAnimation()
      touchInProgress.current = false
      dragCarry.current = 0
      momentumInProgress.current = false
      setElasticOffset(0)
    }
  }, [ref])

  return { transform: `translateY(var(${LAYOUT_TREE_ELASTIC_OFFSET}, 0px))` }
}

export default useClampScrollToVisibleThoughts
