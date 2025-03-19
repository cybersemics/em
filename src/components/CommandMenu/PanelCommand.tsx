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

  // Define specific styles for indent, outdent, medium size, and subcategorizeOne
  const svgStyle = useMemo(() => {
    const isSpecialCommand = command.id === 'indent' || command.id === 'outdent'
    const isSubcategorizeOne = command.id === 'subcategorizeOne'
    const scaleValue = isSpecialCommand ? 'scale(1.3)' : size === 'medium' ? 'scale(1.2)' : 'scale(1)'

    return {
      fill: style.fill,
      flex: isSubcategorizeOne ? 'none' : size === 'medium' ? '1' : 'none',
      transform: scaleValue,
      marginRight: isSubcategorizeOne ? '0.5rem' : '0',
    }
  }, [command.id, style.fill, size])

  return (
    <div
      className={cx(
        css({
          display: 'flex',
          flexDirection: size === 'small' ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          padding: '0.5rem',
          borderRadius: '16px',
          backgroundColor: isButtonActive ? '{colors.purple}' : '{colors.gray15}',
          cursor: isButtonExecutable ? 'pointer' : 'default',
          transition: 'background-color 0.5s ease',
        }),
      )}
      style={style}
      title={`${command.label}${command.keyboard ? ` (${formatKeyboardShortcut(command.keyboard)})` : ''}`}
      {...fastClick(handleTap)}
    >
      <SVG style={svgStyle} animated={isAnimated} animationComplete={() => setIsAnimated(false)} />
      {command.id !== 'indent' && command.id !== 'outdent' && (
        <div
          className={css({
            fontSize: 'sm',
            marginTop: size === 'small' ? '0.5rem' : '0',
            color: '{colors.fg}',
            flex: size === 'medium' ? '2' : 'none',
          })}
        >
          {command.label}
        </div>
      )}
    </div>
  )
}

export default PanelCommand
