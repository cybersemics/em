import { MotionValue, animate, motion, useMotionValue } from 'framer-motion'
import React, { FC, PropsWithChildren, useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import TipId from '../../@types/TipId'
import { dismissTipActionCreator as dismissTip } from '../../actions/dismissTip'
import usePrefetchImages from '../../hooks/usePrefetchImages'
import usePrevious from '../../hooks/usePrevious'
import durations from '../../util/durations'
import fastClick from '../../util/fastClick'
import ProgressiveBlur from '../ProgressiveBlur'
import CloseIcon from '../icons/CloseIcon'
import useSwipeToClear from './useSwipeToClear'

/** Cumulative swipe distance (in px) at which a swipe fully fades and dismisses the tip. */
const SWIPE_DISMISS_THRESHOLD = 200

/** Layer 1: Gradient overlay + progressive blur — darkens and blurs the content behind the tip. */
const TipBlur: FC<{
  opacity: MotionValue<number>
}> = ({ opacity }) => (
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
      <ProgressiveBlur direction='to top' maxBlur={24} layers={3} opacity={opacity} />
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
        opacity={opacity}
        mask='linear-gradient(to right, transparent, black 60%)'
      />
    </div>

    {/* Semi-transparent gradient from bgTransparent → bg, providing the darkening effect.
        Uses a CSS keyframe animation for fade-in (must be a static string for Panda CSS
        build-time extraction — dynamic template literals won't generate CSS rules). */}
    <motion.div
      style={{ opacity: opacity }}
      className={css({
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, {colors.bgTransparent} 0%, {colors.bg} 100%)',
      })}
    />
  </div>
)

/** Layer 2: Glow image — a pre-rendered WebP light-leak effect positioned behind the text content. */
const TipGlow: FC = () => (
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
  />
)

/**
 * A tip that gets displayed at the bottom of the screen, with a Liminal UI design style.
 *
 * The component is composed of three visual layers (back to front):
 * 1. TipBlur — darkens and blurs the content behind the tip.
 * 2. TipGlow — a decorative glow background loaded from a pre-rendered webp image file.
 * 3. Content — the TIP label, message text, and Clear button.
 *
 * There are two ways to dismiss the tip:
 * - Tap/click the Clear button – the tip fades out.
 * - On touch devices, swipe anywhere on the tip: the tip fades out tracking the user's cumulative swipe distance.
 * A combined distance + velocity score determines whether the tip is dismissed on touch end.
 * If the score is below the threshold, the opacity snaps back with a framer-motion spring.
 */
const Tip: FC<
  PropsWithChildren<{
    tipId: TipId
  }>
> = ({ tipId, children }) => {
  const dispatch = useDispatch()
  const tip = useSelector(state => state.tip)

  // Selectors for UI state that should temporarily hide the tip when active to avoid visual conflicts.
  const isKeyboardOpen = useSelector(state => state.isKeyboardOpen)
  const showCommandCenter = useSelector(state => state.showCommandCenter)
  const showSidebar = useSelector(state => state.showSidebar)
  const hasAlert = useSelector(state => !!state.alert)

  /** Prefetch the glow image used in the tip, so that the user doesn't see a loading delay when the tip first becomes visible. */
  usePrefetchImages(['/img/tip/tip-glow-alpha.webp'])

  /** True while the fade-out CSS transition is running (after the user taps Clear or completes a swipe). */
  const [isDismissing, setIsDismissing] = useState(false)

  // ── Swipe-to-dismiss ────────────────────────────────────────────────────

  const onSwipeDismiss = useCallback(
    (immediate: boolean) => {
      if (immediate) {
        dispatch(dismissTip())
      } else {
        setIsDismissing(true)
      }
    },
    [dispatch],
  )

  const { completion, touchHandlers } = useSwipeToClear({
    threshold: SWIPE_DISMISS_THRESHOLD,
    onDismiss: onSwipeDismiss,
  })

  /** Opacity derived from swipe completion. Linearly decreases from 1 -> 0. */
  const swipeOpacity = 1 - completion

  // ── Handlers ────────────────────────────────────────────────────────────

  /** Begins the fade-out transition when the user taps the Clear button. */
  const handleClose = useCallback(() => {
    setIsDismissing(true)
  }, [])

  const isTipActive = tip === tipId
  const isHidden = isKeyboardOpen || showCommandCenter || showSidebar || hasAlert
  const isVisible = isTipActive && !isHidden
  const wasVisible = usePrevious(isVisible)

  // ── Tip opacity (MotionValue) ──────────────────────────────────────────
  // A single MotionValue drives the opacity of all visual layers.
  // Passed directly to ProgressiveBlur and to the motion.div wrapper for glow + content.
  // Handles all opacity conditions: visibility transitions, dismiss, and swipe.
  const opacity = useMotionValue(isVisible ? 1 : 0)

  useEffect(() => {
    if (isVisible && !wasVisible) {
      // Fade in — tip becoming visible (initial or reappearing after temporary hide).
      const duration = durations.get(wasVisible === false ? 'fast' : 'medium') / 1000
      opacity.set(0)
      const controls = animate(opacity, 1, { duration, ease: 'easeOut' })
      return () => controls.stop()
    }
    if (!isVisible && wasVisible) {
      // Fade out — temporarily hidden by keyboard/command center/sidebar/alert.
      const duration = durations.get('fast') / 1000
      const controls = animate(opacity, 0, { duration, ease: 'easeOut' })
      return () => controls.stop()
    }
    if (!isVisible) return
    // Fade out when user dismisses (Clear button or swipe-to-dismiss).
    if (isDismissing) {
      const duration = durations.get('medium') / 1000
      const controls = animate(opacity, 0, {
        duration,
        ease: 'easeOut',
        onComplete: () => {
          dispatch(dismissTip())
          setIsDismissing(false)
        },
      })
      return () => controls.stop()
    }
    // During an active swipe, sync opacity directly to swipe progress.
    opacity.set(swipeOpacity)
  }, [isVisible, wasVisible, isDismissing, swipeOpacity, opacity, dispatch])

  // ── Render ──────────────────────────────────────────────────────────────

  return isTipActive ? (
      <div
        key={tipId}
        className={css({
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 'popup',
          pointerEvents: 'none',
          // Allow dragging through the tip overlay so drag-and-drop still works.
          _dragHold: { pointerEvents: 'none' },
          display: 'flex',
          userSelect: 'none',
          position: 'fixed',
        })}
      >
        {/* Blur layer is outside the opacity wrapper because ProgressiveBlur requires
          its own opacity to work around a Safari backdrop-filter bug. */}
        <TipBlur opacity={opacity} />
        {/* Glow and content layers are wrapped in a motion.div driven by opacity. */}
        <motion.div style={{ opacity: opacity, display: 'flex', width: '100%' }}>
          <TipGlow />

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
              pointerEvents: isVisible ? 'auto' : 'none',
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
            style={{ touchAction: 'none' }}
            {...touchHandlers}
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
              {children}
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
        </motion.div>
      </div>
    </>
  ) : null
}

Tip.displayName = 'Tip'

export default Tip
