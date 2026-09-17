import { FC, useId, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import { pinCommandActionCreator as pinCommand } from '../../actions/pinCommand'
import { unpinCommandActionCreator as unpinCommand } from '../../actions/unpinCommand'
import { commandById, gestureString } from '../../commands'
import GestureDiagram from '../GestureDiagram'
import GradientDivider from '../GradientDivider'
import DialogContent from '../dialog/DialogContent'
import ArrowRightIcon from '../icons/ArrowRightIcon'
import PinnedCommandPinIcon from '../icons/PinnedCommandPinIcon'
import PinnedCommandUnpinIcon from '../icons/PinnedCommandUnpinIcon'
import SettingsIcon from '../icons/SettingsIcon'

interface CommandUniverseDetailPageProps {
  command: Command
}

/**
 * Resolves the user-facing label and description strings, mirroring the logic in
 * `CommandUniverseGridItem`. Honors `labelInverse` / `descriptionInverse` when the
 * command's `isActive` selector is true.
 */
const useCommandLabels = (command: Command) => {
  const isActive = useSelector(state => command.isActive?.(state))
  const label = command.labelInverse && isActive ? command.labelInverse : command.label
  const description = useSelector(state => {
    const value = (isActive && command.descriptionInverse) || command.description
    return typeof value === 'function' ? value(state) : value
  })
  return { label, description }
}

/**
 * A row that pins this command to the persistent corner widget, or unpins it when it is already the pinned command.
 * Pinning replaces any other pinned command and never executes the command.
 */
const PinCommandRow = ({ command }: { command: Command }) => {
  const dispatch = useDispatch()
  // commandById returns the registry's own object, so the selector result is referentially stable
  const pinnedCommand = useSelector(state =>
    state.learning.pinnedCommandId ? commandById(state.learning.pinnedCommandId) : null,
  )
  const isPinned = pinnedCommand?.id === command.id
  const descriptionId = useId()
  const title = isPinned ? 'Unpin Command' : 'Pin Command'

  return (
    <div className={css({ marginBottom: '0.75rem' })}>
      <button
        type='button'
        aria-label={title}
        aria-describedby={descriptionId}
        onClick={() => dispatch(isPinned ? unpinCommand() : pinCommand({ commandId: command.id }))}
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          width: '100%',
          padding: '0.75rem 0',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          color: 'fg',
          fontFamily: 'inherit',
          cursor: 'pointer',
        })}
      >
        <div
          className={css({
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
          })}
        >
          {isPinned ? (
            <PinnedCommandUnpinIcon cssRaw={css.raw({ flex: 'none' })} size={48} fill={token('colors.fg')} />
          ) : (
            <PinnedCommandPinIcon cssRaw={css.raw({ flex: 'none' })} size={48} fill={token('colors.fg')} />
          )}
        </div>
        <div className={css({ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 })}>
          <b className={css({ fontSize: '0.9rem', fontWeight: 400, lineHeight: 1.2 })}>{title}</b>
          <p
            id={descriptionId}
            className={css({
              margin: 0,
              marginTop: '0.25rem',
              color: 'fgOverlay75',
              fontSize: '0.75rem',
              lineHeight: 1.35,
            })}
          >
            {isPinned
              ? 'Remove this command from the corner. Your practice progress is kept.'
              : 'Pin this command to the corner to help you practice and memorise it.'}
            {pinnedCommand && !isPinned ? (
              <>
                {' '}
                This will replace the currently pinned command: <b>{pinnedCommand.label}</b>.
              </>
            ) : null}
          </p>
        </div>
        <ArrowRightIcon size={20} fill={token('colors.fgOverlay75')} cssRaw={css.raw({ flex: 'none' })} />
      </button>
    </div>
  )
}

/**
 * Level 1 of the Command Universe — the per-command detail page reached by tapping a
 * grid cell. Layout: icon + title + subtitle row, optional React content
 * (`command.longDescription`), an optional gesture row, and the Pin Command row.
 *
 * This page owns its content and scroller. Navigation, focus, and motion live outside it.
 */
const CommandUniverseDetailPage: FC<CommandUniverseDetailPageProps> = ({ command }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { label, description } = useCommandLabels(command)
  const Icon = command.svg ?? SettingsIcon
  const iconFill = token('colors.fg')

  return (
    <DialogContent scrollRef={scrollRef}>
      <div className={css({ paddingInline: '0.75rem', paddingTop: '0.5rem', paddingBottom: '1.5rem' })}>
        <header
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '1.3rem',
            paddingTop: '0.35rem',
            paddingBottom: '1.375rem',
          })}
        >
          <div
            className={css({
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
            })}
          >
            <Icon cssRaw={css.raw({ flex: 'none' })} size={36} fill={iconFill} />
          </div>
          <div className={css({ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 })}>
            <h3
              tabIndex={-1}
              data-page-focus
              className={css({
                margin: 0,
                color: 'fg',
                fontSize: '1.125rem',
                fontWeight: 500,
                lineHeight: 1.2,
                outline: 'none',
              })}
            >
              {label}
            </h3>
            {description ? (
              <p
                className={css({
                  margin: 0,
                  color: 'commandUniverseSubtitleText',
                  marginTop: '0.35rem',
                  fontSize: '0.85rem',
                  fontWeight: 300,
                  lineHeight: 1.35,
                })}
              >
                {description}
              </p>
            ) : null}
          </div>
        </header>

        {command.longDescription ? (
          <div
            className={css({
              color: 'commandUniverseLongDescriptionText',
              fontSize: '0.8rem',
              fontWeight: 300,
              letterSpacing: '0.075px',
              lineHeight: 1.5,
              '& > *': { margin: 0 },
              '& > * + *': { marginTop: '0.5rem' },
              '& ul, & ol': { paddingInlineStart: '1.25rem' },
              '& li + li': { marginTop: '0.25rem' },
              '& code': {
                fontFamily: 'inherit',
                backgroundColor: 'codeBg',
                padding: '0 0.25em',
                borderRadius: '0.2em',
              },
            })}
          >
            {command.longDescription}
          </div>
        ) : null}

        {command.gesture ? (
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              paddingTop: command.longDescription ? '0.775rem' : 0,
              paddingBottom: '1.45rem',
            })}
          >
            <div className={css({ flex: 'none', width: '130px', aspectRatio: '1 / 1' })}>
              <GestureDiagram
                path={gestureString(command)}
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
            </div>
            <p
              className={css({
                margin: 0,
                flex: 1,
                fontSize: '0.8rem',
                lineHeight: 1.4,
                backgroundImage:
                  'linear-gradient(158deg, {colors.commandUniverseGestureCaptionGradientStart} 0%, {colors.commandUniverseGestureCaptionGradientEnd} 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
              })}
            >
              Use this gesture in <b>em</b> to quickly activate the command.
            </p>
          </div>
        ) : null}

        <GradientDivider />

        <PinCommandRow command={command} />
      </div>
    </DialogContent>
  )
}

export default CommandUniverseDetailPage
