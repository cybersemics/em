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

const isExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) &&
  (command.allowExecuteFromModal || !state.showModal || !state.showMobileCommandUniverse)

/** Renders a single command row inside the Gesture Menu. */
const GestureItem: FC<{
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
      className={css({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '0.67em',
      })}
    >
      <div
        className={css({
          width: 32,
          height: 32,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
        })}
      >
        <GestureDiagram
          path={command.id === 'cancel' ? null : gestureString(command)}
          highlight={gestureHighlight}
          arrowhead='none'
          disableGlow
          useGradient={false}
          color={token('colors.dim')}
          highlightColor={token('colors.fg')}
          strokeWidth={3}
          maxHeight={32}
          styleCancelAsRegularGesture
        />
      </div>

      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5em',
        })}
      >
        <b
          className={css({
            fontSize: '17px',
            lineHeight: '1em',
            whiteSpace: 'nowrap',
            color: disabled ? 'gray45' : selected ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
            fontWeight: selected ? 600 : 500,
            textShadow: selected
              ? '0px 0px 24px rgba(255, 255, 255, 0.8), 0px 0px 12px rgba(255, 255, 255, 0.6)'
              : undefined,
          })}
        >
          {command.label}
        </b>

        {selected && (
          <p
            className={css({
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.78)',
              marginBlock: 0,
              lineHeight: '1em',
            })}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

export default GestureItem
