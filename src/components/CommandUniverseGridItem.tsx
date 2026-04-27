import React, { FC } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import { isTouch } from '../browser'
import { gestureString } from '../commands'
import useCommandItem from '../hooks/useCommandItem'
import GestureDiagram from './GestureDiagram'
import HighlightedText from './HighlightedText'

interface CommandUniverseGridItemProps {
  command: Command
  search?: string
  /** Click handler for the command. Applies pointer styles when defined. */
  onClick?: (e: React.MouseEvent, command: Command) => void
  selected?: boolean
  onHover?: (command: Command) => void
  shouldScrollSelectedIntoView?: boolean
  isFirstCommand?: boolean
  isLastCommand?: boolean
}

/** Renders a command as a grid cell inside a CommandUniverseGrid (Mobile/Desktop Command Universe). */
const CommandUniverseGridItem: FC<CommandUniverseGridItemProps> = ({
  command,
  search = '',
  onClick,
  selected,
  onHover,
  shouldScrollSelectedIntoView,
  isFirstCommand,
  isLastCommand,
}) => {
  const { setRef, isDragging, isSelectedStyle, disabled, label, description, isAnimated, onAnimationComplete } =
    useCommandItem({
      command,
      selected,
      shouldScrollSelectedIntoView,
      isFirstCommand,
      isLastCommand,
      animateOnSelect: !isTouch && !!command.svg,
    })

  const Icon = command.svg

  return (
    <tr
      ref={setRef}
      onMouseMove={onHover?.bind(null, command)}
      className={css({
        cursor: onClick && !disabled ? 'pointer' : undefined,
        position: 'relative',
        textAlign: 'left',
        backgroundColor: isSelectedStyle ? 'commandSelectedBg' : undefined,
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.533rem',
        justifyContent: 'flex-start',
        alignItems: 'center',
        opacity: isDragging ? 0.5 : 1,
      })}
      onClick={e => {
        if (!disabled) {
          onClick?.(e, command)
        }
      }}
    >
      <td
        className={css({
          boxSizing: 'border-box',
          minWidth: 0,
          width: '100%',
        })}
      >
        {isTouch ? (
          <div
            className={css({
              border: '1px solid {colors.fgOverlay50}',
              borderRadius: '8px',
              textAlign: { _mobile: 'center' },
            })}
          >
            <GestureDiagram
              cssRaw={css.raw({
                width: { sm: '80px', md: '130px' },
                height: { sm: '80px', md: '130px' },
              })}
              path={gestureString(command)}
              size={130}
              arrowSize={25}
              strokeWidth={7.5}
              arrowhead={'outlined'}
            />
          </div>
        ) : Icon ? (
          <Icon
            cssRaw={css.raw({
              cursor: !disabled && onClick ? 'pointer' : 'default',
            })}
            fill={token(disabled ? 'colors.gray50' : 'colors.fg')}
            animated={isAnimated}
            animationComplete={onAnimationComplete}
          />
        ) : (
          // placeholder for icon to keep spacing consistent
          <div className={css({ width: 24, height: 24 })} />
        )}
      </td>

      <td
        className={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '0.25em',
          flexWrap: 'wrap',
          fontWeight: 'normal',
          width: '100%',
        })}
      >
        <b
          className={css({
            minWidth: '4em',
            lineHeight: '1em',
            whiteSpace: 'normal',
            overflowWrap: 'break-word',
            fontSize: '0.8rem',
            color: disabled ? 'gray45' : 'fg',
            fontWeight: 'normal',
          })}
        >
          <HighlightedText value={label} match={search} disabled={disabled} />
        </b>

        <p
          className={css({
            fontSize: '0.622rem',
            marginTop: '0.267rem',
            marginBottom: '0.267rem',
          })}
        >
          {description}
        </p>
      </td>
    </tr>
  )
}

export default CommandUniverseGridItem
