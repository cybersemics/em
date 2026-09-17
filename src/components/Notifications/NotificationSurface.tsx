import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { ReactNode, Ref, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { notificationRecipe } from '../../../styled-system/recipes'
import useSwipeToClear from '../../hooks/useSwipeToClear'
import durations from '../../util/durations'
import ProgressiveBlur from '../ProgressiveBlur'

type Anchor = 'bottom-full' | 'bottom-right'

interface NotificationSurfaceProps {
  /** Runs the surface's guarded fade before notifying its owner. */
  ref?: Ref<{ dismiss: () => void }>
  /** Where the notification sits at each breakpoint. */
  anchor: Anchor | { base: Anchor; lg?: Anchor }
  /** The decorative image treatment. */
  glow: 'rainbow'
  /** Whether the consumer wants the surface visible. Hidden surfaces still mount for the fade. */
  isVisible: boolean
  /** Called once after a Clear action or successful swipe has finished fading the surface. */
  onDismiss?: () => void
  /** Receives the combined visibility and swipe opacity as it changes. */
  onOpacityChange?: (opacity: number) => void
  /** Enable the touch swipe interaction on the content layer. */
  swipeToDismiss?: boolean
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
  children,
}: NotificationSurfaceProps) => {
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
    const controls = animate(visibilityOpacity, target, { duration, ease: 'easeOut' })
    return () => controls.stop()
  }, [isVisible, visibilityOpacity])

  return (
    <div className={slots.container}>
      {/* ProgressiveBlur keeps its own opacity so Safari can animate backdrop-filter correctly. */}
      <div data-notification-blur=''>
        <div data-notification-blur-mobile=''>
          <ProgressiveBlur direction='to top' maxBlur={24} layers={3} opacity={opacity} />
        </div>
        <div data-notification-blur-desktop=''>
          <ProgressiveBlur
            direction='to top'
            maxBlur={24}
            layers={3}
            opacity={opacity}
            mask='var(--notification-blur-feather)'
          />
        </div>
        <motion.div data-notification-gradient='' style={{ opacity }} />
      </div>
      <motion.div data-notification-opacity-wrapper='' style={{ opacity }}>
        <div className={slots.glow} />
        <div
          className={slots.content}
          style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
          {...(swipeToDismiss ? touchHandlers : {})}
        >
          {children}
        </div>
      </motion.div>
    </div>
  )
}

export default NotificationSurface
