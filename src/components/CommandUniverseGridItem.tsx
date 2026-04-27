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

/** Returns true if the command can be executed in the current state. */
const isExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) &&
  (command.allowExecuteFromModal || !state.showModal || !state.showMobileCommandUniverse)

interface CommandUniverseGridItemProps {
  command: Command
  /** Search text that will be highlighted within the matched command title. */
  search?: string
}

/** Renders a single command as a cell in CommandUniverseGrid. Browse-only — no selection, drag, or animation, since the Command Universe is for discovering commands rather than executing them. */
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

  const Icon = command.svg

  return (
    <tr
      className={css({
        position: 'relative',
        textAlign: 'left',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.533rem',
        justifyContent: 'flex-start',
        alignItems: 'center',
      })}
    >
      {/* Gesture trace (touch). Box removed per spec — the artwork itself stays as-is. */}
      {isTouch ? (
        <td
          className={css({
            boxSizing: 'border-box',
            minWidth: 0,
            width: '100%',
            textAlign: 'center',
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
        </td>
      ) : null}

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
        {/* Command icon inline with the title, per spec — replaces the previous stacked layout. */}
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            width: '100%',
          })}
        >
          {Icon && (
            <Icon
              cssRaw={css.raw({ flexShrink: 0 })}
              size={16}
              fill={token(disabled ? 'colors.gray50' : 'colors.fg')}
            />
          )}
          <b
            className={css({
              minWidth: '4em',
              lineHeight: '1em',
              whiteSpace: 'normal',
              overflowWrap: 'break-word',
              // Command title — 14pt (0.875rem), white, slightly stronger weight per spec.
              fontSize: '0.875rem',
              color: disabled ? 'gray45' : 'fg',
              fontWeight: 600,
            })}
          >
            <HighlightedText value={label} match={search} disabled={disabled} />
          </b>
        </div>

        <p
          className={css({
            // 13.5pt (0.84375rem), white at 75% opacity per spec.
            fontSize: '0.84375rem',
            color: 'fgOverlay75',
            marginTop: '0.267rem',
            marginBottom: '0.267rem',
            lineHeight: '1.25em',
          })}
        >
          {description}
        </p>
      </td>
    </tr>
  )
}

export default CommandUniverseGridItem
