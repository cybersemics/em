import { useRef } from 'react'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import { gestureString } from '../../commands'
import useOnClickOutside from '../../hooks/useOnClickOutside'
import usePrefetchImages from '../../hooks/usePrefetchImages'
import GestureDiagram from '../GestureDiagram'
import NotificationSurface from '../Notifications/NotificationSurface'
import ArrowRightIcon from '../icons/ArrowRightIcon'
import HelpIcon from '../icons/HelpIcon'
import SettingsIcon from '../icons/SettingsIcon'

interface PinnedCommandTooltipProps {
  /** The command selected by the learning widget. */
  command: Command
  /** Connects the ring button with this interactive tooltip. */
  id: string
  /** Whether the tooltip is expanded. */
  isOpen: boolean
  /** Closes the tooltip after its fade or swipe animation. */
  onClose: () => void
  /** Reveals this command's detail page without executing it. */
  onReveal: () => void
}

/** Expanded gesture and Command Universe link for the pinned command. */
const PinnedCommandTooltip = ({ command, id, isOpen, onClose, onReveal }: PinnedCommandTooltipProps) => {
  const surfaceRef = useRef<{ dismiss: () => void }>(null)
  const tooltipRef = useRef<HTMLElement>(null)
  usePrefetchImages(['/img/glow/glow-3c.avif'])
  const gesture = gestureString(command)
  const Icon = command.svg ?? SettingsIcon

  useOnClickOutside(tooltipRef, () => {
    if (isOpen) surfaceRef.current?.dismiss()
  })

  return (
    <NotificationSurface
      ref={surfaceRef}
      anchor={{ base: 'bottom-full', lg: 'bottom-right' }}
      glow='learning'
      isVisible={isOpen}
      onDismiss={onClose}
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
          gap: '1rem',
          width: '100%',
          maxWidth: { base: '26rem', lg: '20rem' },
          color: 'fg',
          textAlign: 'left',
        })}
      >
        {gesture ? (
          <button
            type='button'
            aria-label={`Hide gesture for ${command.label}`}
            onClick={() => surfaceRef.current?.dismiss()}
            className={css({
              width: '175px',
              height: '175px',
              alignSelf: 'center',
              padding: 0,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
            })}
          >
            <GestureDiagram
              path={gesture}
              cssRaw={css.raw({ width: '100%', height: '100%' })}
              size={150}
              arrowSize={1}
              strokeWidth={12}
              arrowhead='outlined-wide'
              chevronApexAngle={80}
              chevronSize={2.2}
              cornerRadius={12}
              color='#ffffff'
              gradient={{ from: 'rgba(88, 181, 212, 0.45)', to: 'rgba(255, 255, 255, 1)' }}
              glow={false}
            />
          </button>
        ) : (
          <button
            type='button'
            onClick={() => surfaceRef.current?.dismiss()}
            className={css({
              alignSelf: 'flex-start',
              padding: 0,
              border: 0,
              background: 'transparent',
              color: 'fgOverlay75',
              cursor: 'pointer',
              fontSize: '0.9rem',
            })}
          >
            No gesture is assigned to this command.
          </button>
        )}
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            width: '100%',
            boxSizing: 'border-box',
            paddingInline: '1rem',
          })}
        >
          <div
            className={css({
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              opacity: 0.55,
            })}
            aria-hidden='true'
          >
            <HelpIcon size={28} fill={token('colors.fg')} />
          </div>
          <div className={css({ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 })}>
            <button
              type='button'
              onPointerDown={event => event.preventDefault()}
              onClick={onReveal}
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                alignSelf: 'flex-start',
                padding: 0,
                border: 0,
                background: 'transparent',
                color: 'fg',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 700,
                textAlign: 'left',
              })}
            >
              {command.label}
              <ArrowRightIcon size={18} fill={token('colors.fg')} />
            </button>
            <p className={css({ margin: 0, color: 'fgOverlay75', fontSize: '0.75rem', lineHeight: 1.35 })}>
              {gesture ? 'Trace the gesture to activate.' : 'Open this command in the Command Universe.'}
            </p>
          </div>
          <div className={css({ flex: 'none', width: '22px', height: '22px', opacity: 0.55 })} aria-hidden='true'>
            <Icon size={22} fill={token('colors.fg')} />
          </div>
        </div>
      </section>
    </NotificationSurface>
  )
}

export default PinnedCommandTooltip
