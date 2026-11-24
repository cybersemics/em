import { AnimatePresence, motion } from 'motion/react'
import { memo, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import CommandId from '../../@types/CommandId'
import { isTouch } from '../../browser'
import { commandById, gestureString } from '../../commands'
import { ringCenter } from '../../hooks/useCommandDrag'
import commandDragStore from '../../stores/commandDragStore'
import durations from '../../util/durations'
import GestureDiagram from '../GestureDiagram'
import NotificationSurface from '../Notifications/NotificationSurface'
import SettingsIcon from '../icons/SettingsIcon'

/** How far above the finger the dragged command floats on touch, in px, so the finger does not cover it. */
const TOUCH_LIFT = 56

/** The dragged command: its gesture, or its icon when it has none, and its label over a soft glow. */
const DraggedCommand = memo(({ commandId, iconOnly }: { commandId: CommandId; iconOnly: boolean }) => {
  const command = commandById(commandId)
  const gesture = gestureString(command)
  const Icon = command.svg ?? SettingsIcon
  return (
    <div className={css({ position: 'relative', display: 'flex', alignItems: 'center', gap: '14px' })}>
      {/* The selection highlight from the design: a wide, blurred light behind the command. */}
      <div
        aria-hidden
        className={css({
          position: 'absolute',
          inset: '-12px -28px',
          borderRadius: '999px',
          background: 'commandDragGlow',
          filter: 'blur(32px)',
          opacity: 0.64,
        })}
      />
      <div
        className={css({
          position: 'relative',
          flex: 'none',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        {gesture && !iconOnly ? (
          <GestureDiagram
            path={gesture}
            maxWidth={24}
            maxHeight={24}
            strokeWidth={3}
            arrowSize={6}
            rounded={command.rounded}
            color={token('colors.fg')}
            glow={false}
          />
        ) : (
          <Icon size={20} fill={token('colors.fg')} className={css({ flex: 'none' })} />
        )}
      </div>
      {/* Out of the ring, the hint beside it names the command, and a label here would run off the edge it is dragged
      to. */}
      {!iconOnly && (
        <span
          className={css({
            position: 'relative',
            fontFamily: 'radioCanada',
            fontSize: '18px',
            lineHeight: '26px',
            fontWeight: 700,
            color: 'white',
            opacity: 0.78,
            whiteSpace: 'nowrap',
          })}
        >
          {command.label}
        </span>
      )}
    </div>
  )
})
DraggedCommand.displayName = 'DraggedCommand'

/** A right-pointing chevron after the unpinned command's name, as on a link. */
const Chevron = () => (
  <svg width='8' height='13' viewBox='0 0 8 13' aria-hidden className={css({ flex: 'none', opacity: 0.5 })}>
    <path d='M1.5 1.5L6.5 6.5L1.5 11.5' fill='none' stroke='white' strokeWidth='1.6' strokeLinecap='round' />
  </svg>
)

const hintText = css({
  // Wraps as in the design: "Drag the command here / to pin it."
  maxWidth: '165px',
  fontFamily: 'radioCanada',
  fontSize: '15px',
  lineHeight: '20px',
  fontWeight: 500,
  letterSpacing: '-0.01em',
  color: 'white',
  opacity: 0.61,
})

/** How long the backdrop, the dragged command and the hint take to fade in and out, in seconds. */
const FADE = 0.25

/**
 * The hint's background: the pinned command tooltip's own surface, its blur, scrim and glow, at half strength. It
 * stays mounted a moment after the drag ends so the surface can fade out, and is otherwise unmounted, since its blur
 * layers cost something even while invisible.
 */
const HintSurface = ({ isVisible }: { isVisible: boolean }) => {
  const [isMounted, setIsMounted] = useState(isVisible)
  useEffect(() => {
    if (isVisible) {
      setIsMounted(true)
      return
    }
    const timer = window.setTimeout(() => setIsMounted(false), durations.get('fast') + 50)
    return () => window.clearTimeout(timer)
  }, [isVisible])

  return isMounted ? (
    <NotificationSurface
      anchor={{ base: 'bottom-full', lg: 'bottom-right' }}
      glow='pinnedCommand'
      glowClassName={css({ backgroundImage: 'url(/img/pinned-command/pinned-command-glow.avif)' })}
      isVisible={isVisible}
      dimmed
      pointerEventsPassThrough
    >
      {/* The hint itself is placed against the ring, on the layer above. This gives the surface the height of the
      hint's two lines and footer. */}
      <div className={css({ height: '46px' })} />
    </NotificationSurface>
  ) : null
}

/**
 * What the user sees while dragging a command to pin or unpin it, besides the ring itself: a dimmed backdrop, the
 * command under the pointer, and the hint beside the ring over the tooltip's background. The ring's own response, its
 * light, pop and pulse, lives in PinnedCommand. Nothing here takes pointer events, so the drag's pointer still reaches
 * what is under it.
 *
 * Each fixed layer fades by its own opacity. A shared wrapper with opacity would be a stacking context of its own,
 * below the dialog, so its layers would stay hidden for the length of the fade and then appear all at once.
 */
const CommandDragLayer = () => {
  const drag = commandDragStore.useState()
  const pinnedCommandId = useSelector(state => state.learning.pinnedCommandId)
  const pinnedCommand = pinnedCommandId ? commandById(pinnedCommandId) : undefined

  const hint = drag
    ? drag.source === 'universe'
      ? drag.magnetized
        ? 'Release to pin the command.'
        : 'Drag the command here to pin it.'
      : drag.overEdge
        ? 'Release to unpin the command.'
        : 'Drag to the edge to unpin.'
    : null
  // Pinning a different command replaces the pin and its progress, so the hint says which command that is.
  const replaced =
    drag?.source === 'universe' && pinnedCommand && pinnedCommandId !== drag.commandId ? pinnedCommand : null
  // Where the dragged command sits: the gesture under the pointer, lifted clear of a finger.
  const lift = isTouch ? TOUCH_LIFT : 0
  // Once magnetized, the command and the glow it carries fly into the ring, shrinking toward its center as the ring
  // lights up and takes its icon. They fly back out if the pointer leaves the magnet.
  const ring = drag?.magnetized ? ringCenter() : null
  const flight = drag && ring ? { x: ring.x - drag.x, y: ring.y - (drag.y - lift) } : { x: 0, y: 0 }

  return (
    <>
      <HintSurface isVisible={!!drag} />
      <AnimatePresence>
        {drag && (
          <motion.div
            key='backdrop'
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE, ease: 'easeOut' }}
            className={css({
              position: 'fixed',
              inset: 0,
              zIndex: 'commandDragBackdrop',
              background: 'commandDragBackdrop',
              pointerEvents: 'none',
            })}
          />
        )}
        {drag && (
          <motion.div
            key='foreground'
            data-above-dialog
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE, ease: 'easeOut' }}
            className={css({
              position: 'fixed',
              inset: 0,
              zIndex: 'commandDrag',
              overflow: 'hidden',
              pointerEvents: 'none',
            })}
          >
            <motion.div
              className={css({ position: 'absolute', left: 0, top: 0 })}
              style={{ x: drag.x - 12, y: drag.y - 13 - lift }}
            >
              <motion.div
                // Shrinks toward the gesture, the point that lands on the ring's center.
                className={css({ transformOrigin: '12px 13px' })}
                animate={{
                  x: flight.x,
                  y: flight.y,
                  scale: drag.magnetized ? 0.25 : drag.overEdge ? 0.9 : 1,
                  opacity: drag.magnetized ? 0 : drag.overEdge ? 0.45 : 1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 32,
                  // The light is still visible as it reaches the ring, and goes out there.
                  opacity: { duration: 0.24, ease: 'easeIn' },
                }}
              >
                <DraggedCommand commandId={drag.commandId} iconOnly={drag.source === 'pinned'} />
              </motion.div>
            </motion.div>

            {/* The hint, right-aligned beside the ring and centered on it. During a drag the ring's center sits 34.34px
            above the bottom safe area: 14.34px at rest, plus DRAG_RING_SHIFT. */}
            <div
              className={css({
                position: 'absolute',
                right: '106px',
                bottom: 'calc(max(11px, token(spacing.safeAreaBottom)) + 34.34px)',
                // Centered on the ring, but never lower than 8px above the bottom of the screen, where a device with no
                // safe area would push the footer off it.
                transform: 'translateY(min(50%, calc(max(11px, token(spacing.safeAreaBottom)) + 26.34px)))',
                maxWidth: 'calc(100vw - 122px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                textAlign: 'right',
                gap: '6px',
              })}
            >
              {drag.source === 'pinned' && pinnedCommand && (
                <div className={css({ display: 'flex', alignItems: 'center', gap: '9px' })}>
                  <span
                    className={css({
                      fontFamily: 'radioCanada',
                      fontSize: '20px',
                      lineHeight: '26px',
                      fontWeight: 700,
                      color: 'commandDragTitle',
                      whiteSpace: 'nowrap',
                    })}
                  >
                    {pinnedCommand.label}
                  </span>
                  <Chevron />
                </div>
              )}
              <div className={hintText}>{hint}</div>
              {replaced && (
                <div
                  className={css({
                    fontFamily: 'radioCanada',
                    fontSize: '13px',
                    lineHeight: '20px',
                    whiteSpace: 'nowrap',
                  })}
                >
                  <span className={css({ color: 'commandDragReplacedLabel', opacity: 0.82 })}>{replaced.label}</span>
                  <span className={css({ color: 'commandDragReplacedText', opacity: 0.89 })}> will be unpinned.</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default CommandDragLayer
