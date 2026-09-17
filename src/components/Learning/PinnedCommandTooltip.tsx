import { useRef } from 'react'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import { gestureString } from '../../commands'
import useOnClickOutside from '../../hooks/useOnClickOutside'
import usePrefetchImages from '../../hooks/usePrefetchImages'
import fastClick from '../../util/fastClick'
import GestureDiagram from '../GestureDiagram'
import NotificationSurface from '../Notifications/NotificationSurface'
import CloseIcon from '../icons/CloseIcon'

interface PinnedCommandTooltipProps {
  /** The command selected by the learning widget. */
  command: Command
  /** Connects the ring button with this interactive tooltip. */
  id: string
  /** Whether the tooltip is expanded. */
  isOpen: boolean
  /** Closes the tooltip after its fade or swipe animation. */
  onClose: () => void
  /** Reports the surface opacity so the ring can scale with it. */
  onOpacityChange: (opacity: number) => void
  /** Reveals this command's detail page without executing it. */
  onReveal: () => void
}

/** The pinned command's gesture and Command Universe link in the same visual frame as Tip. */
const PinnedCommandTooltip = ({
  command,
  id,
  isOpen,
  onClose,
  onOpacityChange,
  onReveal,
}: PinnedCommandTooltipProps) => {
  const surfaceRef = useRef<{ dismiss: () => void }>(null)
  const tooltipRef = useRef<HTMLElement>(null)
  usePrefetchImages(['/img/tip/tip-glow-alpha.webp'])
  const gesture = gestureString(command)

  useOnClickOutside(tooltipRef, () => {
    if (isOpen) surfaceRef.current?.dismiss()
  })

  const commandLink = (
    <button
      type='button'
      onPointerDown={event => event.preventDefault()}
      onClick={onReveal}
      className={css({
        padding: 0,
        border: 0,
        background: 'transparent',
        color: 'inherit',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        lineHeight: 'inherit',
        textDecoration: 'underline',
        cursor: 'pointer',
      })}
    >
      {command.label}
    </button>
  )

  return (
    <NotificationSurface
      ref={surfaceRef}
      anchor={{ base: 'bottom-full', lg: 'bottom-right' }}
      glow='rainbow'
      isVisible={isOpen}
      onDismiss={onClose}
      onOpacityChange={onOpacityChange}
      swipeToDismiss
    >
      <section
        ref={tooltipRef}
        id={id}
        role='dialog'
        aria-label={`Gesture for ${command.label}`}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={css({
          display: 'flex',
          flexDirection: 'column',
          gap: '.5rem',
          width: '100%',
          maxWidth: '24rem',
          marginLeft: { base: 0, lg: 'auto' },
          alignItems: { base: 'flex-start', lg: 'flex-end' },
          textAlign: { base: 'left', lg: 'right' },
        })}
      >
        <span
          className={css({
            fontSize: '0.75rem',
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

        <div
          className={css({
            color: 'fg',
            maxWidth: '24rem',
            opacity: 0.8,
            fontSize: '1rem',
            mixBlendMode: 'plus-lighter',
            lineHeight: 1.4,
            fontWeight: 600,
            textShadow: '0 0 4px {colors.fgOverlay40}',
          })}
        >
          {gesture ? (
            <>
              You can activate {commandLink} by swiping{' '}
              <GestureDiagram
                path={gesture}
                size={30}
                color={token('colors.gray66')}
                cssRaw={css.raw({ verticalAlign: 'middle' })}
              />
              .
            </>
          ) : (
            <>No gesture is assigned to this command. Open {commandLink} in the Command Universe.</>
          )}
        </div>

        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            color: 'fg',
            mixBlendMode: 'overlay',
            opacity: 0.6,
            textShadow: '0 0 8px {colors.fgOverlay20}',
            WebkitTapHighlightColor: 'transparent',
            transition: 'opacity {durations.fast} ease',
            _hover: { opacity: 0.8 },
            _active: { opacity: 0.4 },
          })}
          {...fastClick(() => surfaceRef.current?.dismiss())}
        >
          <CloseIcon size={12} />
          <span className={css({ fontSize: '0.75rem' })}>Clear</span>
        </div>
      </section>
    </NotificationSurface>
  )
}

export default PinnedCommandTooltip
