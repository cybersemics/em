import { animate, useMotionValue } from 'framer-motion'
import React, { FC, PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import TipId from '../../@types/TipId'
import { dismissTipActionCreator as dismissTip } from '../../actions/dismissTip'
import usePositionFixed from '../../hooks/usePositionFixed'
import durations from '../../util/durations'
import fastClick from '../../util/fastClick'
import ProgressiveBlur from '../ProgressiveBlur'
import CloseIcon from '../icons/CloseIcon'

/** Cumulative swipe distance (in px) at which a swipe fully fades and dismisses the tip. */
const SWIPE_DISMISS_THRESHOLD = 100

/**
 * A tip that gets displayed at the bottom of the screen, with a Liminal UI design style.
 *
 * The component is composed of three visual layers (back to front):
 *   1. Gradient overlay + progressive blur — darkens and blurs the content behind the tip.
 *   2. Glow image — a decorative glow background loaded from a pre-rendered webp image file.
 *   3. Content — the TIP label, message text, and Clear button.
 *
 * There are two ways to dismiss the tip:
 *   - Tap/click the Clear button – the tip fades out
 *   - On touch devices, swipe anywhere on the tip: the tip fades out tracking the user's cumulative swipe distance.
 *     A combined distance + velocity score determines whether the tip is dismissed on touch end.
 *     If the score is below the threshold, the opacity snaps back with a framer-motion spring.
 */
const Tip: FC<
  PropsWithChildren<{
    tipId: TipId
  }>
> = ({ tipId, children }) => {
  const dispatch = useDispatch()
  const tip = useSelector(state => state.tip)
  const positionFixedStyles = usePositionFixed({ fromBottom: true })

  /** True while the fade-out CSS transition is running (after the user taps Clear or completes a swipe). */
  const [isDismissing, setIsDismissing] = useState(false)

  // ── Swipe-to-dismiss state ──────────────────────────────────────────────

  /** Cumulative distance (px) the user's finger has traveled during the current touch. */
  const [swipeDistance, setSwipeDistance] = useState(0)

  /** Smoothed swipe velocity (px/s) using an exponential moving average. */
  const velocity = useRef(0)

  /** Tracks the last known touch position and timestamp for per-segment velocity calculation. */
  const lastTouch = useRef<{ x: number; y: number; time: number } | null>(null)

  // ── Handlers ────────────────────────────────────────────────────────────

  /** Begins the fade-out transition when the user taps the Clear button. */
  const handleClose = useCallback(() => {
    setIsDismissing(true)
  }, [])

  /**
   * Called when the CSS fade-out transition ends. Dispatches the actual dismissTip action
   * and resets all dismissal state so the component is ready for next use.
   */
  const handleFadeOutEnd = useCallback((e: React.TransitionEvent) => {
    // Ignore transitionend events bubbling up from children (e.g. the clear button's hover/active transitions).
    if (e.target !== e.currentTarget) return
    dispatch(dismissTip())
    setIsDismissing(false)
    setSwipeDistance(0)
  }, [dispatch])

  /** Records the initial touch position and resets velocity/distance for a new swipe gesture. */
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    const touch = e.touches[0]
    lastTouch.current = { x: touch.pageX, y: touch.pageY, time: performance.now() }
    velocity.current = 0
    setSwipeDistance(0)
  }, [])

  /** Accumulates swipe distance and updates the smoothed velocity on each touch move. */
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    if (!lastTouch.current) return
    const touch = e.touches[0]
    const now = performance.now()

    // Calculate the distance of this individual move segment.
    const moveDx = touch.pageX - lastTouch.current.x
    const moveDy = touch.pageY - lastTouch.current.y
    const segmentDistance = Math.sqrt(moveDx * moveDx + moveDy * moveDy)

    // Accumulate total distance traveled (direction-agnostic — any movement counts).
    setSwipeDistance(prev => prev + segmentDistance)

    // Smoothed velocity via exponential moving average (40% previous, 60% current).
    // This dampens jitter while staying responsive to quick flicks.
    const dt = now - lastTouch.current.time
    if (dt > 0) {
      const instantVelocity = (segmentDistance / dt) * 1000
      velocity.current = velocity.current * 0.4 + instantVelocity * 0.6
    }

    lastTouch.current = { x: touch.pageX, y: touch.pageY, time: now }
  }, [])

  /**
   * On touch end, decides whether to dismiss or snap back based on a combined score
   * of cumulative distance and velocity. This lets a short fast flick dismiss the tip
   * just as effectively as a long slow drag.
   */
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation()
      lastTouch.current = null

      // Combined score: distance and velocity compensate for each other.
      // The 0.5 weight on velocity means 200px/s of velocity is equivalent to 100px of distance.
      const score = swipeDistance + velocity.current * 0.5
      if (score >= SWIPE_DISMISS_THRESHOLD) {
        // If the swipe has already fully faded the tip, dismiss immediately.
        // Otherwise, trigger a fade-out animation from the current opacity.
        if (swipeOpacity <= 0) {
          dispatch(dismissTip())
          setSwipeDistance(0)
        } else {
          setSwipeDistance(0)
          setIsDismissing(true)
        }
      } else if (swipeDistance > 0) {
        // Below threshold — snap the opacity back to 1 with a fast ease-out animation.
        animate(swipeDistance, 0, {
          duration: durations.get('fast') / 1000,
          ease: 'easeOut',
          onUpdate: v => setSwipeDistance(v),
        })
      }
      velocity.current = 0
    },
    [dispatch, swipeDistance],
  )

  // ── Derived values ──────────────────────────────────────────────────────

  /** Opacity derived from swipe progress. Linearly decreases from 1 → 0 as the user swipes. */
  const swipeOpacity = Math.max(0, 1 - swipeDistance / SWIPE_DISMISS_THRESHOLD)

  // ── Blur opacity (MotionValue) ──────────────────────────────────────────
  // The blur layer uses a framer-motion MotionValue instead of inline CSS opacity.
  // This avoids a Safari bug where animating opacity on a parent of backdrop-filter
  // children breaks the blur rendering.
  const blurOpacity = useMotionValue(0)
  const isVisible = tip === tipId
  const wasVisible = useRef(false)
  useEffect(() => {
    // Fade in blur when the tip becomes visible, matching the CSS fadein on other layers.
    if (isVisible && !wasVisible.current) {
      wasVisible.current = true
      blurOpacity.set(0)
      const controls = animate(blurOpacity, 1, { duration: durations.get('medium') / 1000, ease: 'easeOut' })
      return () => controls.stop()
    }
    if (!isVisible) {
      wasVisible.current = false
      return
    }
    // Fade out blur when dismissing.
    if (isDismissing) {
      const controls = animate(blurOpacity, 0, { duration: durations.get('medium') / 1000, ease: 'easeOut' })
      return () => controls.stop()
    }
    // During an active swipe, sync blur opacity directly to swipe progress.
    blurOpacity.set(swipeOpacity)
  }, [isVisible, isDismissing, swipeOpacity, blurOpacity])

  // ── Render ──────────────────────────────────────────────────────────────

  const value = isVisible ? children : null

  // CSS transition applied to all layers during the fade-out. Only set when dismissing,
  // so it doesn't interfere with the CSS fadein animation on mount.
  const fadeOut = isDismissing ? `opacity ${durations.get('medium')}ms ease` : undefined

  return value ? (
    <div
      key={tipId}
      className={css({
        left: 0,
        right: 0,
        zIndex: 'popup',
        pointerEvents: 'none',
        // Allow dragging through the tip overlay so drag-and-drop still works.
        _dragHold: { pointerEvents: 'none' },
        display: 'flex',
        userSelect: 'none',
      })}
      style={{
        ...positionFixedStyles,
        // Override usePositionFixed bottom offset to sit flush at the bottom of the viewport.
        bottom: 0,
      }}
    >
      {/* ── Layer 1: Gradient overlay + progressive blur ─────────────────── */}
      <div
        className={css({
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        })}
      >
        {/* Mobile: full-width blur with no horizontal feathering. */}
        <div
          className={css({
            display: { base: 'block', lg: 'none' },
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
          })}
        >
          <ProgressiveBlur direction='to top' maxBlur={24} layers={3} opacity={blurOpacity} />
        </div>

        {/* Desktop: blur is right-aligned (800px wide) with a left-edge feather mask
            so it fades smoothly into the unblurred content on the left. */}
        <div
          className={css({
            display: { base: 'none', lg: 'block' },
            position: 'absolute',
            inset: 0,
            left: 'auto',
            width: 800,
            overflow: 'hidden',
          })}
        >
          <ProgressiveBlur
            direction='to top'
            maxBlur={24}
            layers={3}
            opacity={blurOpacity}
            mask='linear-gradient(to right, transparent, black 60%)'
          />
        </div>

        {/* Semi-transparent gradient from bgTransparent → bg, providing the darkening effect.
            Uses a CSS keyframe animation for fade-in (must be a static string for Panda CSS
            build-time extraction — dynamic template literals won't generate CSS rules). */}
        <div
          className={css({
            animation: 'fadein {durations.medium} ease',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, {colors.bgTransparent} 0%, {colors.bg} 100%)',
          })}
          style={{ opacity: isDismissing ? 0 : swipeOpacity, transition: fadeOut }}
        />
      </div>

      {/* ── Layer 2: Glow image ──────────────────────────────────────────── */}
      {/* A pre-rendered WebP light-leak effect positioned behind the text content.
          On mobile it appears from the left (flipped via scaleX(-1)); on desktop from the right. */}
      <div
        className={css({
          animation: 'fadein {durations.medium} ease',
          position: 'absolute',
          pointerEvents: 'none',
          opacity: 1,
          backgroundImage: 'url(/img/tip/tip-glow-alpha.webp)',
          backgroundRepeat: 'no-repeat',

          // Mobile portrait: Scale the image up 2x, matching the mockups.
          // Larger: just use background-size: cover.
          backgroundSize: {
            base: '200%',
            lg: 'cover',
          },
          backgroundPosition: 'top right',

          // Mobile portrait: 32px extra bleed (16px per side) compensates for filter: blur feathering the edges.
          // Larger: clamped between 1000–1500px so the glow covers enough area without stretching too far.
          width: { base: 'calc(100vw + 32px)', lg: 'clamp(1000px, calc(100vw + 32px), 1500px)' },
          height: 300,

          // Positioning: on mobile portrait, the glow comes from the left edge. On landscape mobile and larger, it comes from the right edge.
          left: { base: -16, lg: 'auto' },
          right: { base: 'auto', lg: -16 },

          // Flip the glow image horizontally on mobile so the brighter part of the glow is on the left side.
          transform: { base: 'scaleX(-1)', lg: 'none' },

          // Applying filter: blur helps us eliminate banding artifacts in the glow image.
          filter: 'blur(8px)',
        })}
        style={{ opacity: isDismissing ? 0 : swipeOpacity, transition: fadeOut }}
      />

      {/* ── Layer 3: Content ─────────────────────────────────────────────── */}
      {/* Contains the TIP label, message text, and Clear button.
          This is the only layer with pointerEvents enabled, and handles swipe-to-dismiss touch events. */}
      <div
        className={css({
          animation: 'fadein {durations.medium} ease',
          position: 'relative',
          // Isolation prevents mix-blend-mode and backdrop-filter from interacting across layers.
          isolation: 'isolate',
          display: 'flex',
          gap: '.5rem',
          flexDirection: 'column',
          pointerEvents: 'auto',
          // Mobile portrait: align left; landscape/desktop: align right
          marginLeft: { base: 0, lg: 'auto' },
          alignItems: { base: 'flex-start', lg: 'flex-end' },
          textAlign: { base: 'left', lg: 'right' },
          padding: '1rem 1.5rem',
          // Extra top padding creates visual breathing room above the text.
          paddingTop: '4.5rem',
          // On devices with safe area insets (notch/home indicator), add the inset to the bottom padding.
          // On devices without, fall back to 1.5rem. Desktop always uses 1.5rem.
          paddingBottom: { base: 'max(1.5rem, calc(0.5rem + env(safe-area-inset-bottom)))', lg: '1.5rem' },
        })}
        style={{ opacity: isDismissing ? 0 : swipeOpacity, transition: fadeOut, touchAction: 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onTransitionEnd={handleFadeOutEnd}
      >
        {/* TIP label — uses plus-lighter blend mode for a subtle luminous effect against the gradient. */}
        <span
          className={css({
            fontSize: '0.85em',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: 'fg',
            mixBlendMode: 'plus-lighter',
            opacity: 0.5,
            textShadow: '0 0 8px {colors.fgOverlay40}',
          })}
        >
          TIP
        </span>

        {/* Tip content — the actual message passed as children. */}
        <div
          className={css({
            color: 'fg',
            maxWidth: '24em',
            opacity: 0.8,
            fontSize: '1.2em',
            mixBlendMode: 'plus-lighter',
            lineHeight: 1.4,
            fontWeight: 600,
            textShadow: '0 0 4px {colors.fgOverlay40}',
          })}
        >
          {value}
        </div>

        {/* Clear button — overlay blend mode keeps it visually subtle until hovered. */}
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '0.4em',
            cursor: 'pointer',
            color: 'fg',
            mixBlendMode: 'overlay',
            opacity: 0.6,
            textShadow: '0 0 8px {colors.fgOverlay20}',
            // Prevent the default tap highlight on iOS/Android.
            WebkitTapHighlightColor: 'transparent',
            transition: 'opacity 150ms ease',
            _hover: { opacity: 0.8 },
            _active: { opacity: 0.4 },
          })}
          {...fastClick(handleClose)}
        >
          <CloseIcon size={12} />
          <span className={css({ fontSize: '0.8em' })}>Clear</span>
        </div>
      </div>
    </div>
  ) : null
}

Tip.displayName = 'Tip'

export default Tip
