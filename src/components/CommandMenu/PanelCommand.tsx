import React, { FC, useCallback, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../../styled-system/css'
import Command from '../../@types/Command'
import Icon from '../../@types/IconType'
import { formatKeyboardShortcut } from '../../commands'
import store from '../../stores/app'
import { executeCommandWithMulticursor } from '../../util/executeCommand'
import fastClick from '../../util/fastClick'

interface PanelCommandProps {
  command: Command
  size?: 'small' | 'medium' | 'large' | 'xlarge'
}

/** A single button in the Panel Command Grid. */
const PanelCommand: FC<PanelCommandProps> = ({ command, size }) => {
  const [isAnimated, setIsAnimated] = useState(false)

  if (!command) {
    console.error('Missing command')
    return null
  }

  const { svg, isActive, canExecute } = command
  const isButtonExecutable = useSelector(state => !canExecute || canExecute(state))
  const commandState = useSelector(state => isActive?.(state))
  const isButtonActive = commandState

  const SVG = svg as React.FC<Icon>

  /** Handles the onClick event. Executes the command when tapped. */
  const handleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isButtonExecutable) {
        executeCommandWithMulticursor(command, { store, type: 'toolbar', event: e })
        setIsAnimated(true)
      }
    },
    [command, isButtonExecutable],
  )

  const gridColumn = useMemo(() => {
    switch (size) {
      case 'small':
        return 'span 1';
      case 'medium':
        return 'span 2';
      case 'large':
        return 'span 2';
      case 'xlarge':
        return 'span 4';
      default:
        return 'span 1';
    }
  }, [size]);

  const style = useMemo(
    () => ({
      fill: isButtonExecutable && isButtonActive ? 'colors.fg' : 'colors.gray50',
      width: size === 'small' ? 24 : size === 'medium' ? 32 : 40,
      height: size === 'small' ? 24 : size === 'medium' ? 32 : 40,
    }),
    [isButtonExecutable, isButtonActive, size],
  )

  return (
    <div
      className={cx(
        css({
          display: 'flex',
          flexDirection: size === 'small' ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.5rem',
          borderRadius: '8px',
          backgroundColor: '{colors.gray15}',
          cursor: isButtonExecutable ? 'pointer' : 'default',
          transition: 'background-color 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: '{colors.darkgray}',
          },
          gridColumn: gridColumn,
        }),
      )}
      title={`${command.label}${command.keyboard ? ` (${formatKeyboardShortcut(command.keyboard)})` : ''}`}
      {...fastClick(handleTap)}
    >
      <SVG style={style} animated={isAnimated} animationComplete={() => setIsAnimated(false)} />
      <div className={css({ fontSize: 'sm', marginTop: '0.5rem', color: '{colors.fg}' })}>{command.label}</div>
    </div>
  )
}

export default PanelCommand
