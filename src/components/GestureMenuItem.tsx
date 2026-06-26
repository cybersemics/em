import { FC, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import State from '../@types/State'
import { gestureString } from '../commands'
import useGestureHighlight from '../hooks/useGestureHighlight'
import store from '../stores/app'
import GestureDiagram from './GestureDiagram'

/** Returns true if the command can be executed in the current state. */
const isExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) &&
  (command.allowExecuteFromModal || !state.showModal || !state.showMobileCommandUniverse)

/** Renders a single command row inside the Gesture Menu. */
const GestureMenuItem: FC<{
  command: Command
  selected: boolean
  gestureInProgress: string
  isFirstCommand?: boolean
  isLastCommand?: boolean
}> = ({ command, selected, gestureInProgress, isFirstCommand, isLastCommand }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const disabled = useSelector((state: State) => !isExecutable(state, command))
  const isActive = command.isActive?.(store.getState())
  const description = useSelector((state: State) => {
    const descFn = (isActive && command.descriptionInverse) || command.description
    return typeof descFn === 'function' ? descFn(state) : descFn
  })

  const gestureHighlight = useGestureHighlight(command, gestureInProgress, selected, disabled)

  useEffect(() => {
    if (!selected) return
    if (!isFirstCommand && !isLastCommand) {
      ref.current?.scrollIntoView({ block: 'nearest' })
      return
    }
    const scrollContainer = ref.current?.parentElement
    if (scrollContainer) {
      scrollContainer.scrollTop = isFirstCommand ? 0 : scrollContainer.scrollHeight
    }
  })

  return (
    <div
      ref={ref}
      // NOTE: Changes to this row's height (gap/padding/line-height) should be reflected in
      // GESTURE_MENU_ROW_LABEL_REM / GESTURE_MENU_ROW_GAP_REM in GestureMenu.tsx, which the decoupled ProgressiveBlur
      // uses to size itself.
      className={css({
        display: 'flex',
        flexDirection: 'row',
        alignItems: selected ? 'stretch' : 'center',
        gap: '0.89rem',
        paddingTop: selected ? '0.6rem' : 0,
        paddingBottom: selected ? '0.1rem' : 0,
      })}
    >
      <div
        className={css({
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: selected ? 'flex-start' : 'center',
          flexShrink: 0,
          width: '1rem',
          height: '1rem',
        })}
      >
        <GestureDiagram
          path={command.id === 'cancel' ? null : gestureString(command)}
          highlight={gestureHighlight}
          arrowhead='none'
          glow={false}
          useGradient={false}
          color={token('colors.dim')}
          highlightColor={token('colors.fg')}
          strokeWidth={3}
          maxHeight={18}
          maxWidth={18}
        />
      </div>

      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        })}
      >
        <div
          className={css({
            fontSize: '0.95rem',
            lineHeight: '1em',
            whiteSpace: 'nowrap',
            color: disabled ? 'gray45' : selected ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
            fontWeight: selected ? 600 : 400,
            textShadow:
              selected && !disabled
                ? '0px 0px 24px rgba(255, 255, 255, 0.8), 0px 0px 12px rgba(255, 255, 255, 0.6)'
                : undefined,
          })}
        >
          {command.label}
        </div>

        {selected && (
          <p
            className={css({
              fontSize: '0.78rem',
              fontWeight: 400,
              color: 'fgOverlay75',
              marginBlock: 0,
              lineHeight: '1.1rem',
            })}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

export default GestureMenuItem
