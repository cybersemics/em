import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { ReactNode, Ref, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { notificationRecipe } from '../../../styled-system/recipes'
import { NOTIFICATION_CORNER_MASK, NOTIFICATION_EASING } from '../../constants'
import usePrefetchImages from '../../hooks/usePrefetchImages'
import useSwipeToClear from '../../hooks/useSwipeToClear'
import durations from '../../util/durations'
import ProgressiveBlur from '../ProgressiveBlur'

type Anchor = 'bottom-full' | 'bottom-right'
type Glow = 'rainbow' | 'pinnedCommand'

/** The decorative image behind each glow treatment. The surface sets the background image and prefetches it on mount. Each entry is a stable array so usePrefetchImages does not re-run every render. */
const GLOW_IMAGES: Record<Glow, [string]> = {
  rainbow: ['/img/tip/tip-glow-alpha.webp'],
  pinnedCommand: ['/img/pinned-command/pinned-command-glow.avif'],
}

interface NotificationSurfaceProps {
  /** Runs the surface's guarded fade before notifying its owner. */
  ref?: Ref<{ dismiss: () => void }>
  /** Where the notification sits at each breakpoint. */
  anchor: Anchor | { base: Anchor; lg?: Anchor }
  /** The decorative image treatment. */
  glow: Glow
  /** Whether the consumer wants the surface visible. Hidden surfaces still mount for the fade. */
  isVisible: boolean
  /** Called once after a Clear action or successful swipe has finished fading the surface. */
  onDismiss?: () => void
  /** Receives the combined visibility and swipe opacity as it changes. */
  onOpacityChange?: (opacity: number) => void
  /** Enable the touch swipe interaction on the content layer. */
  swipeToDismiss?: boolean
  /**
   * Let pointer events over the content layer fall through to the page beneath, so a decorative child such as a
   * gesture diagram does not intercept a trace meant for the thoughtspace. Children that should stay interactive set
   * pointer-events: auto themselves; swipe-to-dismiss still works from those children because their touches bubble
   * to the content layer.
   */
  passThrough?: boolean
  /**
   * Fade the blur, scrim, and glow to half strength, for while the user interacts with the page beneath. Children
   * are not affected, so the consumer decides which of them dim along.
   */
  dimmed?: boolean
  /** Notification-specific content. */
  children: ReactNode
}

/** A notification's positioned blur, glow, and interactive content layers. */
const NotificationSurface = ({
  anchor,
  ref,
  glow,
  isVisible,
  onDismiss,
  onOpacityChange,
  swipeToDismiss = false,
  passThrough = false,
  dimmed = false,
  children,
}: NotificationSurfaceProps) => {
  usePrefetchImages(GLOW_IMAGES[glow])
  const dismissed = useRef(false)
  const dismissing = useRef(false)
  const visibilityOpacity = useMotionValue(0)

  /** Notify the consumer only once even if multiple dismiss events finish together. */
  const handleDismissed = useCallback(() => {
    if (dismissed.current) return
    dismissed.current = true
    dismissing.current = false
    // The swipe hook resets its completion after this callback. Keep the surface hidden through that reset.
    visibilityOpacity.set(0)
    onDismiss?.()
  }, [onDismiss, visibilityOpacity])

  const { completion, touchHandlers, dismiss } = useSwipeToClear({ onDismissed: handleDismissed })
  const swipeOpacity = useTransform(completion, value => 1 - value)
  const opacity = useTransform(
    [swipeOpacity, visibilityOpacity],
    ([swipe, visibility]) => (swipe as number) * (visibility as number),
  )
  // The dim multiplies the decorative layers only. It is kept out of `opacity` so consumers following the surface's
  // opacity, such as the ring's scale, are unaffected.
  const dimOpacity = useMotionValue(1)
  const dimmedOpacity = useTransform([opacity, dimOpacity], ([base, dim]) => (base as number) * (dim as number))

  useEffect(() => {
    const controls = animate(dimOpacity, dimmed ? 0.5 : 1, {
      duration: durations.get('fast') / 1000,
      ease: NOTIFICATION_EASING.open,
    })
    return () => controls.stop()
  }, [dimmed, dimOpacity])
  const slots = notificationRecipe({ anchor, glow })

  useEffect(() => {
    if (!onOpacityChange) return
    onOpacityChange(opacity.get())
    return opacity.on('change', onOpacityChange)
  }, [opacity, onOpacityChange])

  /** Start the same opacity animation for content controls and swipe dismissal. */
  const requestDismiss = useCallback(() => {
    if (dismissing.current || dismissed.current) return
    dismissing.current = true
    dismiss()
  }, [dismiss])

  useImperativeHandle(ref, () => ({ dismiss: requestDismiss }), [requestDismiss])

  useEffect(() => {
    if (isVisible) {
      dismissed.current = false
      dismissing.current = false
    }
    const target = isVisible ? 1 : 0
    const duration = (isVisible ? durations.get('medium') : durations.get('fast')) / 1000
    const controls = animate(visibilityOpacity, target, {
      duration,
      ease: isVisible ? NOTIFICATION_EASING.open : NOTIFICATION_EASING.close,
    })
    return () => controls.stop()
  }, [isVisible, visibilityOpacity])

  return (
    <div className={slots.container}>
      {/* ProgressiveBlur keeps its own opacity so Safari can animate backdrop-filter correctly. */}
      <div data-notification-blur=''>
        <div data-notification-blur-mobile=''>
          <ProgressiveBlur direction='to top' maxBlur={24} layers={3} opacity={dimmedOpacity} />
        </div>
        <div data-notification-blur-desktop=''>
          <ProgressiveBlur
            direction='to top'
            maxBlur={24}
            layers={3}
            opacity={dimmedOpacity}
            mask={NOTIFICATION_CORNER_MASK}
          />
        </div>
        <motion.div data-notification-gradient='' style={{ opacity: dimmedOpacity }} />
      </div>
      <motion.div data-notification-opacity-wrapper='' style={{ opacity }}>
        <motion.div
          className={slots.glow}
          data-notification-glow={glow}
          style={{ opacity: dimOpacity, backgroundImage: `url(${GLOW_IMAGES[glow][0]})` }}
        />
        <div
          className={slots.content}
          style={{ pointerEvents: isVisible && !passThrough ? 'auto' : 'none' }}
          {...(swipeToDismiss ? touchHandlers : {})}
        >
          {children}
        </div>
      </motion.div>
    </div>
  )
}

export default NotificationSurface
