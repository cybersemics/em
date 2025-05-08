import React, { FC, useCallback, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { panelCommandRecipe } from '../../../styled-system/recipes'
import Command from '../../@types/Command'
import Icon from '../../@types/IconType'
import { isTouch } from '../../browser'
import store from '../../stores/app'
import { executeCommandWithMulticursor } from '../../util/executeCommand'
import fastClick from '../../util/fastClick'

interface PanelCommandProps {
  /** The command to execute when the button is tapped. */
  command: Command
  /** The size of the button. */
  size?: 'small' | 'medium' | 'large' | 'xlarge'
}

/** A single button in the Panel Command Grid. */
const PanelCommand: FC<PanelCommandProps> = ({ command, size }) => {
  const [isAnimated, setIsAnimated] = useState(false)

  const { svg, isActive, canExecute } = command
  const isButtonExecutable = useSelector(state => !canExecute || canExecute(state))
  const commandState = useSelector(state => isActive?.(state))
  const isButtonActive = commandState

  /** Handles the onClick event. Executes the command when tapped. */
  const handleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isButtonExecutable) {
        executeCommandWithMulticursor(command, { store, type: 'commandMenu', event: e })
        setIsAnimated(true)
        // prevent Editable blur
        if (isTouch) {
          e.preventDefault()
        }
      }
    },
    [command, isButtonExecutable],
  )

  let SVG: React.FC<Icon> | null = null
  if (svg) {
    SVG = svg as React.FC<Icon>
  }

  return (
    <div
      className={panelCommandRecipe({
        size,
        isButtonExecutable,
        isButtonActive,
      })}
      {...fastClick(handleTap)}
    >
      {SVG && (
        <SVG
          style={{ justifySelf: size === 'small' ? 'center' : 'center' }}
          size={size === 'small' ? 24 : size === 'medium' ? 22 : 24}
          animated={isAnimated}
          animationComplete={() => setIsAnimated(false)}
        />
      )}
      {!command.hideTitleInPanels && (
        <div
          className={css({
            fontSize: 'sm',
            marginTop: size === 'small' ? '0.5rem' : '0',
            color: 'fg',
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
