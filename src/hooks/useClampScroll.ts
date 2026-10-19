import { AnimationPlaybackControls, animate } from 'motion/react'
import { RefObject, useEffect, useLayoutEffect, useRef } from 'react'
import { hasElasticOverscroll } from '../browser'

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
const LAYOUT_TREE_SCROLL_REMAINDER = '--layout-tree-scroll-remainder'
const TOUCH_VELOCITY_WINDOW = 80

interface TouchSample {
  /** The finger's viewport coordinate. */
  y: number
  /** The input-event timestamp in milliseconds. */
  time: number
}

/** Estimates release scroll velocity from recent input, including acceleration, independently of handler timing. */
const getTouchVelocity = (samples: TouchSample[]) => {
  const last = samples[samples.length - 1]
  if (samples.length < 2) return 0

  // Fit position = a + b*t + c*t² with the last input at t=0, so b is its release velocity.
  // Normalizing time to the sampling window avoids poorly conditioned millisecond powers.
  const sums = samples.reduce(
    (sum, sample) => {
      const t = (sample.time - last.time) / TOUCH_VELOCITY_WINDOW
      const y = samples[0].y - sample.y
      return {
        t: sum.t + t,
        t2: sum.t2 + t ** 2,
        t3: sum.t3 + t ** 3,
        t4: sum.t4 + t ** 4,
        y: sum.y + y,
        ty: sum.ty + t * y,
        t2y: sum.t2y + t ** 2 * y,
      }
    },
    { t: 0, t2: 0, t3: 0, t4: 0, y: 0, ty: 0, t2y: 0 },
  )
  const count = samples.length
  const timeVariance = sums.t2 - (sums.t * sums.t) / count
  if (timeVariance <= 0) return 0
  const curveVariance = sums.t4 - (sums.t2 * sums.t2) / count
  const timeCurveCovariance = sums.t3 - (sums.t * sums.t2) / count
  const timePositionCovariance = sums.ty - (sums.t * sums.y) / count
  const curvePositionCovariance = sums.t2y - (sums.t2 * sums.y) / count
  const determinant = timeVariance * curveVariance - timeCurveCovariance ** 2
  // With only two points or nearly coincident timestamps, use a stable linear fit.
  const slope =
    count >= 3 && determinant > 1e-8
      ? (timePositionCovariance * curveVariance - curvePositionCovariance * timeCurveCovariance) / determinant
      : timePositionCovariance / timeVariance
  // Deceleration can reach zero, but must not extrapolate into an unobserved reversal.
  return Math.sign(slope) === Math.sign(samples[0].y - last.y) ? (slope * 1000) / TOUCH_VELOCITY_WINDOW : 0
}

/** Clamps native window scrolling to the vertical band of visible content. */
const useClampScroll = ({
  ref,
  viewportHeight,
  visibleTop,
  visibleBottom,
}: {
  /** The layout container that receives the temporary elastic transform. */
  ref: RefObject<HTMLElement | null>
  /** The viewport height, including any space occupied by the virtual keyboard. */
  viewportHeight: number
  /** The top of visible content relative to the layout container, or undefined when empty. */
  visibleTop: number | undefined
  /** The bottom of visible content relative to the layout container, or undefined when empty. */
  visibleBottom: number | undefined
}) => {
  const touchInProgress = useRef(false)
  const touchMoved = useRef(false)
  const touchStartScrollY = useRef(window.scrollY)
  const animationControls = useRef<AnimationPlaybackControls | null>(null)
  const animationScrollY = useRef(window.scrollY)
  const elasticOffset = useRef(0)
  const scrollRemainder = useRef(0)
  const touchSamples = useRef<TouchSample[]>([])
  const dragCarry = useRef(0)
  const momentumInProgress = useRef(false)
  const drag = useRef({
    startY: window.scrollY,
    startClientY: 0,
    clientY: 0,
    panOffset: null as number | null,
    suspended: false,
    pin: false,
    controlled: false,
  })
  const scrollSample = useRef({ y: window.scrollY, time: performance.now(), velocity: 0 })

  const geometry = useRef({ viewportHeight, visibleTop, visibleBottom })
  const updateBounds = useRef<(() => void) | null>(null)

  // Updating geometry must not discard the finger or restart its gesture recognition.
  useLayoutEffect(() => {
    geometry.current = { viewportHeight, visibleTop, visibleBottom }
    updateBounds.current?.()
  }, [viewportHeight, visibleTop, visibleBottom])

  useEffect(() => {
    /** Shares the elastic offset with the thought tree, footer, and navigation without rerendering them. */
    const setElasticOffset = (value: number) => {
      if (elasticOffset.current === value) return
      elasticOffset.current = value
      document.documentElement.style.setProperty(LAYOUT_TREE_ELASTIC_OFFSET, `${value}px`)
    }

    /** Preserves the fraction of a controlled scroll that the browser cannot represent in scrollY. */
    const setScrollRemainder = (value: number) => {
      if (scrollRemainder.current === value) return
      scrollRemainder.current = value
      document.documentElement.style.setProperty(LAYOUT_TREE_SCROLL_REMAINDER, `${value}px`)
    }

    /** Renders precise controlled positions while keeping the native scroll on whole pixels. */
    const setScrollPosition = (y: number) => {
      // A nonpositive remainder cannot extend the document's scrollable overflow below the footer.
      const rounded = Math.floor(y)
      if (window.scrollY !== rounded) {
        window.scrollTo({ left: window.scrollX, top: rounded, behavior: 'instant' })
      }
      const remainder = window.scrollY - y
      // Only compensate pixel rounding, never a competing native pan or bounce.
      setScrollRemainder(remainder > -1 && remainder <= 0 ? remainder : 0)
    }

    /** Keeps recent input positions, discarding the old direction when the finger reverses. */
    const sampleTouch = (touch: Touch, time: number) => {
      const samples = touchSamples.current
      const previous = samples[samples.length - 1]
      const beforeMoving = samples.reduce<typeof previous | undefined>(
        (lastMoving, sample) => (sample.y !== previous?.y ? sample : lastMoving),
        undefined,
      )
      const reversed = previous && beforeMoving && (touch.clientY - previous.y) * (previous.y - beforeMoving.y) < 0
      const recent = reversed ? [previous] : samples.filter(sample => time - sample.time <= TOUCH_VELOCITY_WINDOW)
      touchSamples.current = [...recent.filter(sample => sample.time < time), { y: touch.clientY, time }]
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
            ? window.scrollY - scrollRemainder.current
            : drag.current.startY + drag.current.startClientY - drag.current.clientY + drag.current.panOffset) +
          dragCarry.current
        : window.scrollY - scrollRemainder.current
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
        // The footer follows negative elastic displacement; bounds must use its untransformed position.
        footerRect
          ? footerRect.bottom + window.scrollY - Math.min(0, elasticOffset.current) - scrollRemainder.current
          : 0,
      )
      const maxScrollY = Math.min(
        nativeMax,
        Math.max(minScrollY, visibleContentBottom - (viewportBottomBoundary - viewportAllowance)),
      )
      const clampedScrollY = Math.min(maxScrollY, Math.max(minScrollY, y))
      // The real page edges already use UIScrollView's bounce. Avoid applying resistance twice there.
      const nativeOverscroll =
        !drag.current.controlled &&
        dragCarry.current === 0 &&
        ((minScrollY === 0 && y < 0) || (maxScrollY === nativeMax && y > nativeMax))
      return { y, clampedScrollY, minScrollY, maxScrollY, nativeMax, nativeOverscroll }
    }

    /** Returns elastic displacement to a visible boundary with a fixed native scroll position. */
    const springBack = ({ offset, velocity, boundary }: { offset: number; velocity: number; boundary: number }) => {
      stopAnimation()
      momentumInProgress.current = false
      const anchor = Math.round(boundary)
      setScrollPosition(anchor)
      const initialOffset = offset + window.scrollY - boundary
      setScrollRemainder(0)
      setElasticOffset(initialOffset)
      animationScrollY.current = window.scrollY
      animationControls.current = animate(initialOffset, 0, {
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
      if (touchInProgress.current && drag.current.panOffset === null && window.scrollY !== touchStartScrollY.current) {
        // Preserve native pan-recognition slop, then use unresisted finger travel even past the physical page edge.
        drag.current.panOffset =
          window.scrollY -
          scrollRemainder.current -
          drag.current.startY -
          drag.current.startClientY +
          drag.current.clientY
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
        if (drag.current.controlled) {
          // The native pan was prevented from its first move, so there is no UIKit bounce to compensate for.
          // Keep native scrolling inside the band and let only the transform stretch beyond the boundary.
          setScrollPosition(clampedScrollY)
          setElasticOffset(resisted)
        } else {
          setElasticOffset(rawOffset === 0 && dragCarry.current === 0 ? 0 : window.scrollY - clampedScrollY + resisted)
        }
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
      const bounds = getBounds()
      const target = event.target instanceof Element ? event.target : null
      // A custom boundary needs one owner for the entire swipe. Letting UIKit pan first and taking over
      // only at the edge leaves its bounce running underneath our spring (scrollTo does not stop it on iOS 27).
      // Native editing controls and nested scrollers retain their own touch handling.
      const controlled = !!(
        event.touches.length === 1 &&
        bounds &&
        (bounds.minScrollY > 0 || bounds.maxScrollY < bounds.nativeMax) &&
        target?.closest('#content-wrapper, [aria-label="footer"]') &&
        !target.closest('input, textarea, select, button, a, [contenteditable], [data-scroll-at-edge]')
      )
      stopAnimation()
      touchInProgress.current = true
      touchMoved.current = false
      touchStartScrollY.current = window.scrollY
      momentumInProgress.current = false
      drag.current = {
        startY: window.scrollY - scrollRemainder.current,
        startClientY: event.touches[0].clientY,
        clientY: event.touches[0].clientY,
        panOffset: controlled ? 0 : null,
        suspended: event.touches.length !== 1,
        pin: interrupted,
        controlled,
      }
      const { viewportHeight } = geometry.current
      const distance = Math.abs(elasticOffset.current)
      // Invert the drag curve so subsequent native scroll deltas continue from this exact visible position.
      dragCarry.current =
        (-Math.sign(elasticOffset.current) * distance * viewportHeight) /
        (RUBBER_BAND_COEFFICIENT * Math.max(1, viewportHeight - distance))
      scrollSample.current = {
        y: window.scrollY - scrollRemainder.current + dragCarry.current,
        time: performance.now(),
        velocity: 0,
      }
      touchSamples.current = [{ y: event.touches[0].clientY, time: event.timeStamp }]
    }

    /** Handles finger movement, claiming bounded content swipes before native panning starts. */
    const onTouchMove = (event: TouchEvent) => {
      if (!drag.current.suspended && (event.defaultPrevented || event.touches.length !== 1)) {
        drag.current.suspended = true
        touchStartScrollY.current = window.scrollY
      }
      if (drag.current.suspended) return
      // This must run on the first move, before native scrolling starts; stopping it at the boundary is too late.
      if (drag.current.controlled) event.preventDefault()
      touchMoved.current = true
      drag.current.clientY = event.touches[0].clientY
      sampleTouch(event.touches[0], event.timeStamp)
      // Wait for native pan recognition so touches consumed by editor gestures never become scrolling.
      if (drag.current.panOffset !== null) clampScroll()
    }

    /** Gives deliberate navigation priority over elastic scrolling. */
    const onIntentionalScroll = () => {
      stopAnimation()
      touchInProgress.current = false
      drag.current.controlled = false
      momentumInProgress.current = false
      dragCarry.current = 0
      setElasticOffset(0)
      setScrollRemainder(0)
    }

    /** Releases a drag into native momentum or a velocity-preserving return spring. */
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length > 0 || !touchInProgress.current) return
      const bounds = getBounds()
      if (!bounds) {
        touchInProgress.current = false
        drag.current.controlled = false
        return
      }
      const { y, clampedScrollY, nativeOverscroll } = bounds
      const rawOffset = clampedScrollY - y
      const carried = dragCarry.current !== 0
      const controlled = drag.current.controlled && touchMoved.current
      // A final changed touch can contain movement not delivered by touchmove. A stationary release
      // must not dilute the last moving velocity merely because the finger lifted between input frames.
      const finalTouch = event.changedTouches[0]
      if (finalTouch && finalTouch.clientY !== drag.current.clientY) sampleTouch(finalTouch, event.timeStamp)
      const recentTouches = touchSamples.current.filter(
        sample => event.timeStamp - sample.time <= TOUCH_VELOCITY_WINDOW,
      )
      const touchVelocity = getTouchVelocity(recentTouches)
      const nativeVelocity =
        performance.now() - scrollSample.current.time < TOUCH_VELOCITY_WINDOW ? scrollSample.current.velocity : 0
      const velocity =
        event.type === 'touchcancel' || drag.current.suspended
          ? 0
          : drag.current.panOffset !== null
            ? touchVelocity
            : nativeVelocity
      touchInProgress.current = false
      drag.current.controlled = false
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
      } else if (carried || controlled) {
        // Continue a controlled or interrupted drag with the normal UIScrollView decay.
        setElasticOffset(0)
        setScrollPosition(clampedScrollY)
        animationScrollY.current = window.scrollY
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
            setScrollPosition(bounded)
            animationScrollY.current = window.scrollY
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
      // Inertia checks fresh bounds each frame. Compare a spring's native anchor on the same pixel
      // grid as its bounds, so an unchanged fractional boundary cannot cancel a valid return.
      if (
        animationControls.current &&
        bounds &&
        (momentumInProgress.current ||
          (animationScrollY.current >= Math.round(bounds.minScrollY) &&
            animationScrollY.current <= Math.round(bounds.maxScrollY)))
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
      window.addEventListener('touchmove', onTouchMove, { passive: false })
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
      drag.current.controlled = false
      dragCarry.current = 0
      momentumInProgress.current = false
      setElasticOffset(0)
      setScrollRemainder(0)
    }
  }, [ref])

  return {
    transform: `translateY(calc(var(${LAYOUT_TREE_ELASTIC_OFFSET}, 0px) + var(${LAYOUT_TREE_SCROLL_REMAINDER}, 0px)))`,
  }
}

export default useClampScroll
