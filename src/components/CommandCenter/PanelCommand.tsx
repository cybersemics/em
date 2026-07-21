import React, { FC, useCallback, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../../styled-system/css'
import { panelCommandRecipe } from '../../../styled-system/recipes'
import Command from '../../@types/Command'
import Icon from '../../@types/IconType'
import { isTouch } from '../../browser'
import { executeCommandWithMulticursor } from '../../commands'
import store from '../../stores/app'
import fastClick from '../../util/fastClick'
import FadeTransition from '../FadeTransition'

interface PanelCommandProps {
  /** The command to execute when the button is tapped. */
  command: Command
  /** The size of the button. */
  size?: 'small' | 'medium'
}

interface ActiveButtonGlowImageProps {
  isActive: boolean | undefined
}

/** Pre-blurred additive glow that avoids Android corruption from filtered HSL blend layers. */
const ActiveButtonGlowImage: FC<ActiveButtonGlowImageProps> = ({ isActive }) => {
  const nodeRef = useRef<HTMLDivElement>(null)
  return (
    <FadeTransition
      type='activeButtonGlow'
      in={isActive}
      unmountOnExit
      nodeRef={nodeRef}
      /**
       * When `in={true}` on mount, we need appear={true} to trigger the enter transition.
       * We need the enter transition, because the opacity is set inside the transition styles.
       **/
      appear
    >
      <div
        ref={nodeRef}
        className={css({
          gridArea: 'command',
          margin: -40,
          pointerEvents: 'none',
          backgroundImage: 'url(/img/command-center/active-glow.png)',
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          mixBlendMode: 'plus-lighter',
        })}
      />
    </FadeTransition>
  )
}

/** A single button in the Panel Command Grid. */
const PanelCommand: FC<PanelCommandProps> = ({ command, size }) => {
  const [isAnimated, setIsAnimated] = useState(false)

  const { svg, isActive, canExecute } = command
  const isButtonExecutable = useSelector(state => !canExecute || canExecute(state))
  const isButtonActive = useSelector(state => isActive?.(state))

  /** Handles the onClick event. Executes the command when tapped. */
  const handleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isButtonExecutable) {
        executeCommandWithMulticursor(command, { store, type: 'commandCenter', event: e })
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
      className={css({
        display: 'grid',
        ...(size === 'medium'
          ? { gridColumn: 'span 2', gridTemplateColumns: '1fr 2fr', gridTemplateAreas: `"command command"` }
          : { gridColumn: 'span 1', gridTemplateColumns: 'auto', gridTemplateAreas: `"command"` }),
      })}
    >
      <ActiveButtonGlowImage isActive={isButtonActive} />
      <div
        className={cx(
          panelCommandRecipe({
            isButtonExecutable,
          }),
          css({ gridArea: 'command' }),
        )}
        {...fastClick(handleTap)}
      >
        {SVG && (
          <SVG
            style={{ justifySelf: 'center' }}
            size={size === 'small' ? 24 : size === 'medium' ? 22 : 24}
            animated={isAnimated}
            animationComplete={() => setIsAnimated(false)}
          />
        )}
        {!command.hideTitleInPanels && size === 'medium' && (
          <div
            className={css({
              fontSize: '14px',
              color: 'fg',
              textAlign: 'left',
              letterSpacing: '-2%',
            })}
          >
            {command.label}
          </div>
        )}
      </div>
    </div>
  )
}

export default PanelCommand
