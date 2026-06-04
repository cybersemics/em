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

const COMMAND_ICON_SIZE = 20

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

  const Icon = command.svg ?? SettingsIcon

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
        // Children are flush-left so the command icon + title sit at the cell's left edge.
        alignItems: 'flex-start',
        marginInline: '0.2rem',
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
          {/* `flex: none` cancels iconRecipe's base `flex: 1`, which would otherwise let the
              glyph grow or shrink to fill space — making it tiny when the title is long and
              huge when it's short. The wrapping div has explicit width/height = size, so the
              icon now always renders at exactly COMMAND_ICON_SIZE. Commands without a custom
              icon fall back to SettingsIcon as a placeholder. */}
          <div
            className={css({ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' })}
            style={{ width: COMMAND_ICON_SIZE, height: COMMAND_ICON_SIZE }}
          >
            <Icon
              cssRaw={css.raw({ flex: 'none' })}
              size={COMMAND_ICON_SIZE}
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
      </td>
    </tr>
  )
}

export default CommandUniverseGridItem
