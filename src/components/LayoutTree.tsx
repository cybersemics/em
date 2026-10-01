import { isEqual, throttle } from 'lodash'
import { AnimationPlaybackControls, animate } from 'motion/react'
import { RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css, cx } from '../../styled-system/css'
import Index from '../@types/IndexType'
import ThoughtId from '../@types/ThoughtId'
import { isIOS, isMac, isTouch } from '../browser'
import { CONTENT_BOX_PADDING_LEFT, LongPressState } from '../constants'
import testFlags from '../e2e/testFlags'
import usePositionedThoughts from '../hooks/usePositionedThoughts'
import useSizeTracking from '../hooks/useSizeTracking'
import fauxCaretTreeProvider from '../recipes/fauxCaretTreeProvider'
import { hasChildren } from '../selectors/getChildren'
import linearizeTree from '../selectors/linearizeTree'
import nextSibling from '../selectors/nextSibling'
import viewportStore from '../stores/viewportStore'
import head from '../util/head'
import parentOf from '../util/parentOf'
import BulletCursorOverlay from './BulletCursorOverlay'
import HoverArrow from './HoverArrow'
import TreeNode from './TreeNode'

/** The padding-bottom of the .content element. Make sure it matches the CSS. */
const CONTENT_PADDING_BOTTOM = 153
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

/** Calculates the height of a single-line thought. Initially uses an estimated height, then uses the height measured from thn DOM. */
const useSingleLineHeight = (sizes: Index<{ height: number; width?: number; isVisible: boolean }>) => {
  const fontSize = useSelector(state => state.fontSize)
  // singleLineHeight is the measured height of a single line thought.
  // If no sizes have been measured yet, use the estimated height.
  // Cache the last measured value in a ref in case sizes no longer contains any single line thoughts.
  // Then do not update it again.
  const singleLineHeightPrev = useRef<number | null>(null)
  const singleLineHeight = useMemo(() => {
    // The estimatedHeight calculation is ostensibly related to the font size, line height, and padding, though the process of determination was guess-and-check. This formula appears to work across font sizes.
    // If estimatedHeight is off, then totalHeight will fluctuate as actual sizes are saved (due to estimatedHeight differing from the actual single-line height).
    const estimatedHeight = fontSize * 2

    const singleLineHeightMeasured = Object.values(sizes).find(
      // TODO: This does not differentiate between leaves, non-leaves, cliff thoughts, which all have different sizes.
      ({ height }) => Math.abs(height - estimatedHeight) < height / 2,
    )?.height
    if (singleLineHeightMeasured) {
      singleLineHeightPrev.current = singleLineHeightMeasured
    }
    return singleLineHeightPrev.current || estimatedHeight
  }, [fontSize, sizes])

  return singleLineHeight
}

/** Measure the total height of the .nav and .footer elements on render. Always triggers a second render (which is nonconsequential since useSizeTracking already entails additional renders as heights are rendered). */
const useNavAndFooterHeight = () => {
  // Get the nav and footer heights for the spaceBelow calculation.
  // Nav hight changes when the breadcrumbs wrap onto multiple lines.
  // Footer height changes on font size change.
  const [navbarHeight, setNavbarHeight] = useState(0)
  const [footerHeight, setFooterHeight] = useState(0)

  // Read the footer and nav heights on render and set the refs so that the spaceBelow calculation is updated on the next render.
  // This works because there is always a second render due to useSizeTracking.
  // No risk of infinite render since the effect cannot change the height of the nav or footer.
  // nav/footer height -> effect -> setNavbarHeight/setFooterHeight -> render -> effect -> setNavbarHeight/setFooterHeight (same values)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(
    throttle(() => {
      const navEl = document.querySelector('[aria-label="nav"]')
      const footerEl = document.querySelector('[aria-label="footer"]')
      setNavbarHeight(navEl?.getBoundingClientRect().height || 0)
      setFooterHeight(footerEl?.getBoundingClientRect().height || 0)
    }, 16.666),
  )

  return {
    navbarHeight,
    footerHeight,
  }
}

/** A hook that returns a ref to the content div and updates the viewport store's layoutTreeTop property on mount. */
const useLayoutTreeTop = (ref: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    if (!ref.current) return
    viewportStore.update({ layoutTreeTop: ref.current.offsetTop || 0 })
  }, [ref])

  return ref
}

/** Clamps native window scrolling to the vertical band of autofocus-visible thoughts. */
const useClampScrollToVisibleThoughts = ({
  ref,
  viewportHeight,
  visibleThoughtExtrema,
}: {
  ref: RefObject<HTMLElement | null>
  viewportHeight: number
  visibleThoughtExtrema: { top: number; bottom: number } | null
}) => {
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
        // Rebasing an interrupted drag cancels native inertia. Continue it with the normal UIScrollView decay.
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
}

/** Lays out thoughts as DOM siblings with manual x,y positioning. */
const LayoutTree = () => {
  const editing = useSelector(state => state.isKeyboardOpen)
  const { sizes, setSize } = useSizeTracking()
  const treeThoughts = useSelector(linearizeTree, isEqual)
  const fontSize = useSelector(state => state.fontSize)
  const dragInProgress = useSelector(state => state.longPress === LongPressState.DragInProgress)
  const ref = useRef<HTMLDivElement>(null)
  const indentDepth = useSelector(state =>
    state.cursor && state.cursor.length > 2
      ? // when the cursor is on a leaf, the indention level should not change
        state.cursor.length - (hasChildren(state, head(state.cursor)) ? 2 : 3)
      : 0,
  )

  // Width of thought bullet, using the default from Bullet.tsx
  const [bulletWidth, setBulletWidth] = useState(fontSize * 1.25)
  // Distance from toolbar to the first visible thought
  const [layoutTop, setLayoutTop] = useState(0)

  // set the bullet width only during drag or when simulateDrop is true
  useLayoutEffect(() => {
    if (dragInProgress || testFlags.simulateDrop) {
      const bullet = ref.current?.querySelector('[aria-label=bullet]')
      if (bullet) setBulletWidth(bullet?.getBoundingClientRect().width)

      setLayoutTop(ref.current?.getBoundingClientRect().top ?? 0)
    }
  }, [dragInProgress, ref])

  const singleLineHeight = useSingleLineHeight(sizes)

  // cursor depth, taking into account that a leaf cursor has the same autofocus depth as its parent
  const autofocusDepth = useSelector(state => {
    // only set during drag-and-drop to avoid re-renders
    if (
      (state.longPress !== LongPressState.DragInProgress && !testFlags.simulateDrag && !testFlags.simulateDrop) ||
      !state.cursor
    )
      return 0
    const isCursorLeaf = !hasChildren(state, head(state.cursor))
    return state.cursor.length + (isCursorLeaf ? -1 : 0)
  })

  // first uncle of the cursor used for DropUncle
  const cursorUncleId = useSelector(state => {
    // only set during drag-and-drop to avoid re-renders
    if (
      (state.longPress !== LongPressState.DragInProgress && !testFlags.simulateDrag && !testFlags.simulateDrop) ||
      !state.cursor
    )
      return null
    const isCursorLeaf = !hasChildren(state, head(state.cursor))
    const cursorParentId = state.cursor[state.cursor.length - (isCursorLeaf ? 3 : 2)] as ThoughtId | null
    return (cursorParentId && nextSibling(state, cursorParentId)?.id) || null
  })

  const viewportHeight = viewportStore.useSelector(viewport => viewport.innerHeight)

  const {
    // the total amount of space above the first visible thought that will be cropped
    spaceAbove,

    // Sum all the sizes to get the total height of the containing div.
    // Use estimated single-line height for the thoughts that do not have sizes yet.
    // Exclude hidden thoughts below the cursor to reduce empty scroll space.
    totalHeight,
  } = treeThoughts.reduce(
    (accum, node) => {
      const heightNext =
        node.key in sizes
          ? sizes[node.key].isVisible || !node.belowCursor
            ? sizes[node.key].height
            : 0
          : singleLineHeight
      return {
        totalHeight: accum.totalHeight + heightNext,
        spaceAbove:
          accum.spaceAbove + (sizes[node.key] && !sizes[node.key].isVisible && !node.belowCursor ? heightNext : 0),
      }
    },
    {
      totalHeight: 0,
      spaceAbove: 0,
    },
  )

  // Offset the virtualization boundary by hidden space above the cursor and five additional thoughts below the
  // viewport. TreeNode combines this stable offset with scrollTop so that LayoutTree does not rerender on scroll.
  const viewportBottomOffset = spaceAbove + singleLineHeight * 5

  const { footerHeight, navbarHeight } = useNavAndFooterHeight()
  const navAndFooterHeight = navbarHeight + footerHeight

  // memoize the cliff padding style to avoid passing a fresh object reference as prop to TreeNode and forcing a re-render
  const cliffPadding = fontSize / 4
  const cliffPaddingStyle = useMemo(() => ({ paddingBottom: cliffPadding }), [cliffPadding])

  const { indentCursorAncestorTables, treeThoughtsPositioned, hoverArrowVisibility } = usePositionedThoughts(
    treeThoughts,
    {
      maxVisibleY: viewportHeight - (layoutTop + navbarHeight),
      singleLineHeight,
      sizes,
    },
  )

  // compare between state.cursor and the position of the thought
  const cursorThoughtPositionedIndex = treeThoughtsPositioned.findIndex(thought => thought.isCursor)
  const cursorThoughtPositioned = treeThoughtsPositioned[cursorThoughtPositionedIndex]
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

  // The indentDepth multipicand (0.9) causes the horizontal counter-indentation to fall short of the actual indentation, causing a progressive shifting right as the user navigates deeper. This provides an additional cue for the user's depth, which is helpful when autofocus obscures the actual depth, but it must stay small otherwise the thought width becomes too small.
  // The indentCursorAncestorTables multipicand (0.5) is smaller, since animating over by the entire width of column 1 is too abrupt.
  const indent = indentDepth * 0.9 + indentCursorAncestorTables / fontSize

  /** The space added below the last rendered thought and the breadcrumbs/footer. This is calculated such that there is a total of one viewport of height between the last rendered thought and the bottom of the document. This ensures that when the keyboard is closed, the scroll position will not change. If the caret is on a thought at the top edge of the screen when the keyboard is closed, then the document will shrink by the height of the virtual keyboard. The scroll position will only be forced to change if the document height is less than window.scrollY + window.innerHeight. */
  // Subtract singleLineHeight since we can assume that the last rendered thought is within the viewport. (It would be more accurate to use its exact rendered height, but it just means that there may be slightly more space at the bottom, which is not a problem. The scroll position is only forced to change when there is not enough space.)
  const spaceBelow = viewportHeight - navAndFooterHeight - CONTENT_PADDING_BOTTOM - singleLineHeight

  useLayoutTreeTop(ref)
  useClampScrollToVisibleThoughts({ ref, viewportHeight, visibleThoughtExtrema })

  const treeThoughtsMemoized = useMemo(
    () =>
      treeThoughtsPositioned.map(thought => ({
        ...thought,
        style: {
          ...thought.style,
          // Ensure that transforming the thought's position by its indent level cannot push it off-screen.
          // The extra 17px is to make sure it doesn't get cut off under the scrollbar
          maxWidth: `calc(${window.innerWidth > 560 ? '90' : '100'}vw - ${CONTENT_BOX_PADDING_LEFT + thought.x}px - ${1.5 - indent}em)`,
        },
      })),
    [indent, treeThoughtsPositioned],
  )

  return (
    <div
      className={cx(
        css({
          marginTop: '0.501rem',
        }),
        fauxCaretTreeProvider(indent),
      )}
      style={{ transform: `translateY(var(${LAYOUT_TREE_ELASTIC_OFFSET}, 0px))` }}
      ref={ref}
    >
      <HoverArrow
        // Calculate the position of the arrow relative to the bottom of the container.
        bottom={totalHeight + spaceBelow - viewportHeight + navAndFooterHeight}
        hoverArrowVisibility={hoverArrowVisibility}
      />
      <div
        className={css({ transition: `transform {durations.layoutSlowShift} ease-out` })}
        style={{
          // Set a container height that fits all thoughts.
          // Otherwise scrolling down quickly will bottom out as virtualized thoughts are re-rendered and the document height is built back up.
          height: totalHeight + spaceBelow,
          // Use translateX instead of marginLeft to prevent multiline thoughts from continuously recalculating layout as their width changes during the transition.
          transform: `translateX(${1.5 - indent}em`,
          // Add a negative marginRight equal to translateX to ensure the thought takes up the full width.
          // Not animated for a more stable visual experience.
          marginRight: `${-indent + (isTouch ? 2 : -1)}em`,
        }}
      >
        {cursorThoughtPositioned && (
          <BulletCursorOverlay
            isTableCol1={cursorThoughtPositioned.isTableCol1}
            path={cursorThoughtPositioned.path}
            simplePath={cursorThoughtPositioned.simplePath}
            height={cursorThoughtPositioned.height}
            x={cursorThoughtPositioned.x}
            y={cursorThoughtPositioned.y}
            showContexts={cursorThoughtPositioned.showContexts}
            width={cursorThoughtPositioned.width}
            parentId={head(parentOf(cursorThoughtPositioned.path))}
          />
        )}
        <TransitionGroup>
          {treeThoughtsMemoized.map((thought, index) => (
            <TreeNode
              {...thought}
              index={index}
              // Pass unique key for the component
              key={thought.key}
              // Pass the thought key as a thoughtKey and not key property as it will conflict with React's key
              thoughtKey={thought.key}
              editing={editing || false}
              {...{
                viewportHeight,
                viewportBottomOffset,
                treeThoughtsPositioned,
                bulletWidth,
                cursorUncleId,
                setSize,
                cliffPaddingStyle,
                dragInProgress,
                autofocusDepth,
              }}
            />
          ))}
        </TransitionGroup>
      </div>
    </div>
  )
}

export default LayoutTree
