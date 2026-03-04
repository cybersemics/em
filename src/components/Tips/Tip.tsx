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
const SWIPE_DISMISS_THRESHOLD = 150

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

  // Swipe-to-dismiss: track touch origin and current distance
  const touchOrigin = useRef<{ x: number; y: number } | null>(null)
  const [swipeDistance, setSwipeDistance] = useState(0)

  const handleClose = useCallback(() => {
    setIsDismissing(true)
  }, [])

  const handleFadeOutEnd = useCallback(() => {
    dispatch(dismissTip())
    setIsDismissing(false)
  }, [dispatch])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    const touch = e.touches[0]
    touchOrigin.current = { x: touch.pageX, y: touch.pageY }
    setSwipeDistance(0)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    if (!touchOrigin.current) return
    const touch = e.touches[0]
    const dx = touch.pageX - touchOrigin.current.x
    const dy = touch.pageY - touchOrigin.current.y
    setSwipeDistance(Math.sqrt(dx * dx + dy * dy))
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation()
      touchOrigin.current = null
      if (swipeDistance >= SWIPE_DISMISS_THRESHOLD) {
        dispatch(dismissTip())
        setSwipeDistance(0)
      } else if (swipeDistance > 0) {
        animate(swipeDistance, 0, {
          duration: durations.get('fast') / 1000,
          ease: 'easeOut',
          onUpdate: v => setSwipeDistance(v),
        })
      }
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
      const controls = animate(blurOpacity, 1, { duration: 0.4, ease: 'easeOut' })
      return () => controls.stop()
    }
    if (!isVisible) {
      wasVisible.current = false
      return
    }
    if (isDismissing) {
      const controls = animate(blurOpacity, 0, { duration: 0.4, ease: 'easeOut' })
      return () => controls.stop()
    }
    blurOpacity.set(swipeOpacity)
  }, [isVisible, isDismissing, swipeOpacity, blurOpacity])

  const value = isVisible ? children : null

  const fadeIn = 'fadein 400ms ease'
  const fadeOut = isDismissing ? 'opacity 400ms ease' : undefined

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
            animation: fadeIn,
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
          animation: 'fademostlyin 400ms ease',
          position: 'absolute',
          pointerEvents: 'none',
          opacity: 0.85,
          backgroundImage: 'url(/img/tip/tip-glow-alpha.webp)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'top right',
          // The glow is intentionally much larger than the viewport.
          // Only ~40% is visible; the rest overflows off-screen and is clipped by the parent's overflow:hidden.
          width: { base: 'calc(100vw + 16px)', lg: 600 },
          height: 300,
          // Mobile portrait: bottom-left, flipped horizontally
          left: { base: -8, lg: 'auto' },
          right: { base: 'auto', lg: -8 },
          transform: { base: 'scaleX(-1)', lg: 'none' },
          filter: 'blur(8px)',
        })}
        style={{ opacity: isDismissing ? 0 : swipeOpacity * 0.85, transition: fadeOut }}
      />

      {/* Layer 3: Content */}
      <div
        className={css({
          animation: fadeIn,
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
          paddingBottom: { base: 'calc(1rem + env(safe-area-inset-bottom))', lg: '1rem' },
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
