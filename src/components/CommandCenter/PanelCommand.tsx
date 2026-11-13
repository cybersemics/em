import React, { FC, useCallback, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../../styled-system/css'
import { panelCommandRecipe } from '../../../styled-system/recipes'
import Command from '../../@types/Command'
import Icon from '../../@types/IconType'
import { isTouch } from '../../browser'
import { executeCommandWithMulticursor } from '../../commands'
import useFitText from '../../hooks/useFitText'
import useRemAsPx from '../../hooks/useRemAsPx'
import store from '../../stores/app'
import fastClick from '../../util/fastClick'
import FadeTransition from '../FadeTransition'

/** The largest a small button's icon grows to as the font size increases, which is as large as it can be and still clear the button's padding on a narrow phone. */
const MAX_SMALL_ICON_SIZE = 44

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

/** The label of a medium button. It follows the user's font size, and shrinks to fit the button once it no longer fits at that size. */
const PanelCommandLabel: FC<{ label: string }> = ({ label }) => {
  const ref = useRef<HTMLDivElement>(null)
  // 14px at the default font size.
  useFitText(ref, { text: label, maxFontSize: useRemAsPx(0.875) })
  return (
    <div
      ref={ref}
      className={css({
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: 'fg',
        textAlign: 'left',
        letterSpacing: '-2%',
      })}
    >
      {label}
    </div>
  )
}

/** A single button in the Panel Command Grid. */
const PanelCommand: FC<PanelCommandProps> = ({ command, size }) => {
  const [isAnimated, setIsAnimated] = useState(false)

  const { svg, isActive, canExecute } = command
  const isButtonExecutable = useSelector(state => !canExecute || canExecute(state))
  const isButtonActive = useSelector(state => isActive?.(state))
  const smallIconSize = Math.min(useRemAsPx(1.5), MAX_SMALL_ICON_SIZE)

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

  const hasLabel = !command.hideTitleInPanels && size === 'medium'
  // Icons are read like text, so a small button's icon grows with the user's font size, as far as the fixed-width button has room for. A medium button's icon stays at its default size instead, leaving the room beside it to the label, which has more to say.
  const iconSize = size === 'medium' ? 22 : smallIconSize

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
        aria-label={command.label}
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
            size={iconSize}
            animated={isAnimated}
            animationComplete={() => setIsAnimated(false)}
          />
        )}
        {hasLabel && <PanelCommandLabel label={command.label} />}
      </div>
    </div>
  )
}

export default PanelCommand
