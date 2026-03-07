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

/** Distance in px at which a swipe fully fades and dismisses the tip. */
const SWIPE_DISMISS_THRESHOLD = 100

/** A tip that gets displayed at the bottom of the window with a Liminal UI overlay design. */
const Tip: FC<
  PropsWithChildren<{
    tipId: TipId
  }>
> = ({ tipId, children }) => {
  const dispatch = useDispatch()
  const tip = useSelector(state => state.tip)
  const positionFixedStyles = usePositionFixed({ fromBottom: true })

  const [isDismissing, setIsDismissing] = useState(false)
  const isSwipeDismiss = useRef(false)

  // Swipe-to-dismiss: track cumulative distance and velocity
  const [swipeDistance, setSwipeDistance] = useState(0)
  const velocity = useRef(0)
  const lastTouch = useRef<{ x: number; y: number; time: number } | null>(null)

  const handleClose = useCallback(() => {
    setIsDismissing(true)
  }, [])

  const handleFadeOutEnd = useCallback((e: React.TransitionEvent) => {
    // Ignore transitionend events bubbling up from children (e.g. the clear button's hover/active transitions).
    if (e.target !== e.currentTarget) return
    dispatch(dismissTip())
    setIsDismissing(false)
    isSwipeDismiss.current = false
    setSwipeDistance(0)
  }, [dispatch])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    const touch = e.touches[0]
    lastTouch.current = { x: touch.pageX, y: touch.pageY, time: performance.now() }
    velocity.current = 0
    setSwipeDistance(0)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    if (!lastTouch.current) return
    const touch = e.touches[0]
    const now = performance.now()

    const moveDx = touch.pageX - lastTouch.current.x
    const moveDy = touch.pageY - lastTouch.current.y
    const segmentDistance = Math.sqrt(moveDx * moveDx + moveDy * moveDy)

    // Accumulate total distance traveled
    setSwipeDistance(prev => prev + segmentDistance)

    // Smoothed velocity (exponential moving average)
    const dt = now - lastTouch.current.time
    if (dt > 0) {
      const instantVelocity = (segmentDistance / dt) * 1000
      velocity.current = velocity.current * 0.4 + instantVelocity * 0.6
    }

    lastTouch.current = { x: touch.pageX, y: touch.pageY, time: now }
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation()
      lastTouch.current = null

      // Combined score: distance and velocity compensate for each other
      const score = swipeDistance + velocity.current * 0.5
      if (score >= SWIPE_DISMISS_THRESHOLD) {
        // If the swipe has already fully faded the tip, dismiss immediately.
        // Otherwise, trigger a fade-out animation from the current opacity.
        if (swipeOpacity <= 0) {
          dispatch(dismissTip())
          setSwipeDistance(0)
        } else {
          isSwipeDismiss.current = true
          setSwipeDistance(0)
          setIsDismissing(true)
        }
      } else if (swipeDistance > 0) {
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

  const swipeOpacity = Math.max(0, 1 - swipeDistance / SWIPE_DISMISS_THRESHOLD)

  // MotionValue for ProgressiveBlur opacity — avoids Safari bug where
  // animating opacity on a parent of backdrop-filter children breaks the blur.
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
    if (isDismissing) {
      const dismissDuration = isSwipeDismiss.current ? 'fast' : 'medium'
      const controls = animate(blurOpacity, 0, { duration: durations.get(dismissDuration) / 1000, ease: 'easeOut' })
      return () => controls.stop()
    }
    blurOpacity.set(swipeOpacity)
  }, [isVisible, isDismissing, swipeOpacity, blurOpacity])

  const value = isVisible ? children : null

  const dismissDuration = isSwipeDismiss.current ? 'fast' : 'medium'
  const fadeOut = isDismissing ? `opacity ${durations.get(dismissDuration)}ms ease` : undefined

  return value ? (
    <div
      key={tipId}
      className={css({
        left: 0,
        right: 0,
        zIndex: 'popup',
        pointerEvents: 'none',
        // allow dragging through the tip overlay
        _dragHold: { pointerEvents: 'none' },
        display: 'flex',
        userSelect: 'none',
      })}
      style={{
        ...positionFixedStyles,
        // override usePositionFixed bottom offset to sit flush at the bottom
        bottom: 0,
      }}
    >
      {/* Layer 1: Gradient overlay with progressive blur */}
      <div
        className={css({
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        })}
      >
        {/* Mobile: full-width blur, no feather */}
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
        {/* Desktop: right-aligned blur with left-edge feather */}
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

      {/* Layer 2: Glow image */}
      <div
        className={css({
          animation: 'fademostlyin {durations.medium} ease',
          position: 'absolute',
          pointerEvents: 'none',
          opacity: 1,
          backgroundImage: 'url(/img/tip/tip-glow-alpha.webp)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'top right',
          // The glow is intentionally much larger than the viewport.
          // Only ~40% is visible; the rest overflows off-screen and is clipped by the parent's overflow:hidden.
          width: { base: 'calc(100vw + 32px)', lg: 600 },
          height: 300,
          // Mobile portrait: bottom-left, flipped horizontally
          left: { base: -16, lg: 'auto' },
          right: { base: 'auto', lg: -16 },
          transform: { base: 'scaleX(-1)', lg: 'none' },
          filter: 'blur(8px)',
        })}
        style={{ opacity: isDismissing ? 0 : swipeOpacity * 0.85, transition: fadeOut }}
      />

      {/* Layer 3: Content */}
      <div
        className={css({
          animation: 'fadein {durations.medium} ease',
          position: 'relative',
          // prevent mix-blend-mode and backdrop-filter from affecting each other
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
          paddingTop: '4.5rem',
          /** paddingBottom: on devices that have safe area insets, add 1rem to the bottom inset and use that as padding.
           *  for devices that don't, use 1.5rem to match the horizontal padding
           *  for lg (desktop), always use 1.5rem
          */
          paddingBottom: { base: 'max(1.5rem, calc(1rem + env(safe-area-inset-bottom)))', lg: '1.5rem' },
        })}
        style={{ opacity: isDismissing ? 0 : swipeOpacity, transition: fadeOut, touchAction: 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onTransitionEnd={handleFadeOutEnd}
      >
        {/* TIP label */}
        <span
          className={css({
            fontSize: '0.85em',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: 'white',
            mixBlendMode: 'overlay',
            opacity: 0.6,
            textShadow: '0 0 8px rgba(255, 255, 255, 0.2)',
          })}
        >
          TIP
        </span>

        {/* Tip content */}
        <div
          className={css({
            color: 'fg',
            maxWidth: '24em',
            opacity: 0.8,
            mixBlendMode: 'plus-lighter',
            lineHeight: 1.4,
            fontWeight: 600,
          })}
        >
          {value}
        </div>

        {/* Clear button */}
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '0.4em',
            cursor: 'pointer',
            color: 'white',
            mixBlendMode: 'overlay',
            opacity: 0.6,
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
