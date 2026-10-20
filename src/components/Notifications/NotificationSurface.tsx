import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { ReactNode, Ref, useEffect, useImperativeHandle } from 'react'
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
  /** The glow's image. The notification that shows it defines and prefetches it, keeping the path beside its use. */
  glowImage: string
  /** Whether the consumer wants the surface visible. Hidden surfaces still mount for the fade. */
  isVisible: boolean
  /** Called once after a Clear action or successful swipe has finished fading the surface. */
  onDismiss?: () => void
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
  glowImage,
  isVisible,
  onDismiss,
  swipeToDismiss = false,
  children,
}: NotificationSurfaceProps) => {
  // The swipe hook calls onDismiss once per showing, however the surface was dismissed.
  const { completion, touchHandlers, dismiss, reset } = useSwipeToClear({ onDismissed: onDismiss })
  const swipeOpacity = useTransform(completion, value => 1 - value)
  const visibilityOpacity = useMotionValue(0)
  const opacity = useTransform(
    [swipeOpacity, visibilityOpacity],
    ([swipe, visibility]) => (swipe as number) * (visibility as number),
  )
  const slots = notificationRecipe({ anchor, glow })

  // Content controls such as Clear dismiss with the same fade as a swipe.
  useImperativeHandle(ref, () => ({ dismiss: () => dismiss() }), [dismiss])

  useEffect(() => {
    // Each showing can be dismissed once.
    if (isVisible) reset()
    const target = isVisible ? 1 : 0
    const duration = (isVisible ? durations.get('medium') : durations.get('fast')) / 1000
    const controls = animate(visibilityOpacity, target, { duration, ease: 'easeOut' })
    return () => controls.stop()
  }, [isVisible, reset, visibilityOpacity])

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
        <div className={slots.glow} style={{ backgroundImage: `url(${glowImage})` }} />
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
