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
  className?: string
}

/** A single button in the Panel Command Grid. */
const PanelCommand: FC<PanelCommandProps> = ({ command, className, size }) => {
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
        executeCommandWithMulticursor(command, { store, type: 'commandMenu', event: e })
        setIsAnimated(true)
      }
    },
    [command, isButtonExecutable],
  )

  const gridColumn = useMemo(() => {
    switch (size) {
      case 'small':
        return 'span 1'
      case 'medium':
        return 'span 2'
      case 'large':
        return 'span 2'
      case 'xlarge':
        return 'span 4'
      default:
        return 'span 1'
    }
  }, [size])

  const style = useMemo(
    () => ({
      fill: isButtonExecutable && isButtonActive ? '{colors.purple}' : '{colors.gray15}',
      gridColumn,
      opacity: isButtonExecutable ? 1 : 0.5,
      transition: 'opacity 0.5s ease, background-color 0.5s ease',
    }),
    [isButtonExecutable, isButtonActive, gridColumn],
  )

  return (
    <div
      className={cx(
        css({
          display: 'grid',
          gridTemplateColumns: size === 'medium' ? '1fr 2fr' : 'auto',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          padding: '0.5rem',
          borderRadius: '16px',
          backgroundColor: isButtonActive ? '{colors.purple}' : '{colors.gray15}',
          cursor: isButtonExecutable ? 'pointer' : 'default',
          transition: 'background-color 0.5s ease',
        }),
        className ? className : css({}),
      )}
      style={style}
      title={`${command.label}${command.keyboard ? ` (${formatKeyboardShortcut(command.keyboard)})` : ''}`}
      {...fastClick(handleTap)}
    >
      <SVG
        style={{ fill: style.fill, justifySelf: size === 'small' ? 'center' : 'start' }}
        size={size === 'small' ? 18 : size === 'medium' ? 22 : 18}
        animated={isAnimated}
        animationComplete={() => setIsAnimated(false)}
      />
      {command.id !== 'indent' && command.id !== 'outdent' && (
        <div
          className={css({
            fontSize: 'sm',
            marginTop: size === 'small' ? '0.5rem' : '0',
            color: '{colors.fg}',
            textAlign: size === 'medium' ? 'left' : 'center',
          })}
        >
          {command.label}
        </div>
      )}
    </div>
  )
}

export default PanelCommand
