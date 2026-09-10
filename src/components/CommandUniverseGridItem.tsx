import { FC } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import State from '../@types/State'
import { isTouch } from '../browser'
import { gestureString } from '../commands'
import useCommandUniverseNavigator from '../hooks/useCommandUniverseNavigator'
import GestureDiagram from './GestureDiagram'
import HighlightedText from './HighlightedText'
import CircleEllipsisIcon from './icons/CircleEllipsisIcon'
import SettingsIcon from './icons/SettingsIcon'

const GESTURE_GRADIENT = {
  from: token('colors.gestureDiagramGradientStart'),
  to: token('colors.gestureDiagramGradientEnd'),
}

/** Returns true if the command can be executed in the current state. */
const isExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) &&
  (command.allowExecuteFromModal || !state.showModal || !state.showMobileCommandUniverse)

interface CommandUniverseGridItemProps {
  command: Command
  /** Search text that will be highlighted within the matched command title. */
  search?: string
}

/** Renders a single command as a cell in CommandUniverseGrid. */
const CommandUniverseGridItem: FC<CommandUniverseGridItemProps> = ({ command, search = '' }) => {
  const navigator = useCommandUniverseNavigator()
  const isActive = useSelector(state => command.isActive?.(state))
  const disabled = useSelector(state => !isExecutable(state, command))
  const label = command.labelInverse && isActive ? command.labelInverse : command.label
  const description = useSelector(state => {
    const descriptionStringOrFunction = (isActive && command.descriptionInverse) || command.description
    return typeof descriptionStringOrFunction === 'function'
      ? descriptionStringOrFunction(state)
      : descriptionStringOrFunction
  })

  const Icon = command.svg ?? SettingsIcon

  return (
    <tr>
      <td className={css({ display: 'block', height: '100%' })}>
        <button
          type='button'
          aria-label={label}
          onClick={event =>
            navigator.open('detail', { command }, { origin: event.currentTarget.getBoundingClientRect() })
          }
          className={css({
            position: 'relative',
            cursor: 'pointer',
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            padding: 0,
            color: 'inherit',
            font: 'inherit',
            _focusVisible: { outline: '2px solid {colors.fg}', outlineOffset: '2px' },
            textAlign: 'left',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.533rem',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            marginInline: '0.2rem',
          })}
        >
          {/* Detail-page affordance. Command execution availability only affects the icon and text styling. */}
          <div
            aria-hidden
            className={css({
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 1,
            })}
          >
            <CircleEllipsisIcon size={20} fill={token(disabled ? 'colors.gray50' : 'colors.fg')} />
          </div>

          {/* Gesture diagram container. */}
          {isTouch ? (
            <div
              className={css({
                boxSizing: 'border-box',
                minWidth: 0,
                width: '100%',
                textAlign: 'center',
              })}
            >
              <div
                className={css({
                  width: '100%',
                  aspectRatio: '1 / 1',
                  maxWidth: '130px',
                  margin: '0 auto',
                })}
              >
                <GestureDiagram
                  path={gestureString(command)}
                  cssRaw={css.raw({ display: 'block' })}
                  size={150}
                  arrowSize={1}
                  strokeWidth={12}
                  arrowhead='outlined-wide'
                  cornerRadius={12}
                  rounded={command.rounded}
                  gradient={GESTURE_GRADIENT}
                  glow={false}
                />
              </div>
            </div>
          ) : null}

          <div
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
            {/* Command icon inline with the title. */}
            <div
              className={css({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: '100%',
                gap: '0.75rem',
              })}
            >
              {/* `flex: none` overrides iconRecipe's `flex: 1` default so width/height set the size. */}
              <div
                className={css({ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' })}
                style={{ width: 20, height: 20 }}
              >
                <Icon
                  cssRaw={css.raw({ flex: 'none' })}
                  size={20}
                  fill={token(disabled ? 'colors.gray50' : 'colors.fg')}
                />
              </div>
              <b
                className={css({
                  minWidth: '4em',
                  whiteSpace: 'normal',
                  overflowWrap: 'break-word',
                  color: disabled ? 'gray45' : 'fg',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  lineHeight: 1.35,
                })}
              >
                <HighlightedText value={label} match={search} disabled={disabled} />
              </b>
            </div>

            <p
              className={css({
                color: 'fgOverlay75',
                marginTop: '0.267rem',
                marginBottom: '0.267rem',
                fontSize: '0.6875rem',
                opacity: 0.8,
                marginLeft: '-0.2rem',
                lineHeight: 1.3,
              })}
            >
              {description}
            </p>
          </div>
        </button>
      </td>
    </tr>
  )
}

export default CommandUniverseGridItem
