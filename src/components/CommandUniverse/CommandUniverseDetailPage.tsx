import { FC, useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import { gestureString } from '../../commands'
import GestureDiagram from '../GestureDiagram'
import DialogContent from '../dialog/DialogContent'
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
 * Level 1 of the Command Universe — the per-command detail page reached by tapping a
 * grid cell. Layout: icon + title + subtitle row, and an optional gesture row showing
 * the diagram with a short caption to its right.
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
      <div className={css({ paddingInline: '1.25rem', paddingTop: '0.5rem', paddingBottom: '1.5rem' })}>
        <header
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            paddingTop: '0.5rem',
            paddingBottom: '1.25rem',
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
                fontSize: '1.1rem',
                fontWeight: 400,
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
                  color: 'fgOverlay75',
                  marginTop: '0.25rem',
                  fontSize: '0.8rem',
                  fontWeight: 300,
                  opacity: 0.85,
                  lineHeight: 1.35,
                })}
              >
                {description}
              </p>
            ) : null}
          </div>
        </header>

        {command.gesture ? (
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              paddingTop: 0,
              paddingBottom: '1.5rem',
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
              />
            </div>
            <p className={css({ margin: 0, color: 'fg', flex: 1, fontSize: '0.75rem', lineHeight: 1.4 })}>
              Use this gesture in <b>em</b> to quickly activate the command.
            </p>
          </div>
        ) : null}
      </div>
    </DialogContent>
  )
}

export default CommandUniverseDetailPage
