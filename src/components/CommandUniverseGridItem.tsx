import { FC } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import State from '../@types/State'
import { isTouch } from '../browser'
import { gestureString } from '../commands'
import store from '../stores/app'
import GestureDiagram from './GestureDiagram'
import HighlightedText from './HighlightedText'
import SettingsIcon from './icons/SettingsIcon'

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
  const isActive = command.isActive?.(store.getState())
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
    <div
      className={css({
        position: 'relative',
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
      {isTouch ? (
        <div
          className={css({
            boxSizing: 'border-box',
            minWidth: 0,
            width: '100%',
            textAlign: 'center',
          })}
        >
          {/* Responsive square wrapper: the cell width drives the diagram size, capped so it never
              balloons past its natural max. The diagram runs in `fillContainer` mode to fill this box. */}
          <div
            className={css({
              display: 'block',
              width: '100%',
              aspectRatio: '1 / 1',
              margin: '0 auto',
              maxWidth: '130px',
            })}
          >
            <GestureDiagram
              fillContainer
              path={gestureString(command)}
              size={150}
              arrowSize={1}
              strokeWidth={12}
              color='#ffffff'
              arrowhead='outlined-wide'
              chevronApexAngle={80}
              chevronSize={2.2}
              cornerRadius={12}
              tipExtension={28}
              gradient={{ from: 'rgba(88, 181, 212, 0.45)', to: 'rgba(255, 255, 255, 1)' }}
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
            <Icon cssRaw={css.raw({ flex: 'none' })} size={20} fill={token(disabled ? 'colors.gray50' : 'colors.fg')} />
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
    </div>
  )
}

export default CommandUniverseGridItem
