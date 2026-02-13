import React, { FC, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import { gestureString } from '../commands'
import openGestureCheatsheetCommand from '../commands/openGestureCheatsheet'
import useFilteredCommands from '../hooks/useFilteredCommands'
import gestureStore, {
  onGestureMenuEntered,
  onGestureMenuExited,
  startGestureMenuEnter,
  startGestureMenuExit,
} from '../stores/gesture'
import storageModel from '../stores/storageModel'
import CommandItem from './CommandItem'
import FadeTransition from './FadeTransition'
import PopupBase from './PopupBase'

/**********************************************************************
 * Components
 **********************************************************************/

/** Render a gesture menu with gesture autocomplete. */
const GestureMenu: FC<{
  commands: Command[]
}> = ({ commands }) => {
  const gestureInProgress = gestureStore.useSelector(state => state.gesture)
  const fontSize = useSelector(state => state.fontSize)

  const hasMatchingCommand = commands.some(cmd => (gestureInProgress as string) === gestureString(cmd))

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        maxWidth: '100%',
      })}
    >
      <div
        className={css({
          marginBottom: 0,
          textAlign: 'left',
          maxWidth: '100%',
          maxHeight: '100%',
          width: 826,
          cursor: 'default',
          display: 'flex',
          flexDirection: 'column',
        })}
        style={{ fontSize }}
      >
        {gestureInProgress && (
          <div
            className={css({
              padding: '0.85em 0.66em',
            })}
          >
            {commands.map((command, index) => {
              // Check if the current gesture sequence ends with help gesture
              const cheatsheetInProgress = gestureInProgress
                ?.toString()
                .endsWith(gestureString(openGestureCheatsheetCommand))
              const isCheatsheetMatch = command.id === 'openGestureCheatsheet' && cheatsheetInProgress
              const isCancelMatch = command.id === 'cancel' && !hasMatchingCommand && !cheatsheetInProgress

              return (
                <CommandItem
                  gestureInProgress={gestureInProgress as string}
                  key={command.id}
                  selected={isCheatsheetMatch || gestureInProgress === gestureString(command) || isCancelMatch}
                  command={command}
                  isFirstCommand={index === 0}
                  isLastCommand={index === commands.length - 1}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/** Renders a blur effect overlay for the gesture menu. */
function ProgressiveBlur() {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      className={css({
        pointerEvents: 'none',
        position: 'absolute',
        backdropFilter: 'blur(5px)',
        mask: 'linear-gradient(180deg, {colors.black} 0%, {colors.bgOverlay80} calc(100% - 20px), {colors.bgTransparent} 100%)',
        width: '100%',
        top: 0,
        height: '100%',
      })}
    />
  )
}

/** Renders the glow effect for the gesture menu. */
function Glow() {
  return (
    <div
      className={css({
        position: 'absolute',
        pointerEvents: 'none',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      })}
    >
      <div
        className={css({
          backgroundImage: 'url(/img/gesture-menu/glow.webp)',
          backgroundRepeat: 'no-repeat',
          mixBlendMode: 'screen',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          backgroundSize: 'cover',
          '@media (max-width: 1024px)': {
            transform: 'translateX(-30%) scaleX(3.3)',
          },
          '@media (max-width: 560px)': {
            transform: 'translateX(-40%) scaleX(2.5)',
          },
        })}
      />
    </div>
  )
}

/** Renders a gradient overlay for the gesture menu. */
function Overlay() {
  return (
    <div
      className={css({
        pointerEvents: 'none',
        position: 'absolute',
        background: 'linear-gradient(180deg, {colors.black} 0%, {colors.bgOverlay80} 30%, {colors.bgTransparent} 100%)',

        top: 0,
        width: '100%',
        height: '100%',
      })}
    />
  )
}

/** A GestureMenu component that fades in and out based on state.showGestureMenu. */
const GestureMenuWithTransition: FC = () => {
  const popupRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const showGestureMenu = useSelector(state => state.showGestureMenu)
  const animationState = gestureStore.useSelector(state => state.gestureMenuAnimationState)

  // Commands need to be calculated even if the gesture menu is not shown because useFilteredCommands is responsible for updating gestureStore's possibleCommands which is needed to prevent haptics when there are no more possible commands. Otherwise, either haptics would continue to fire when there are no more possible commands, or would falsely fire when the current sequence is not a valid gesture but there are possible commands with additional swipes.
  const [recentCommands] = useState(storageModel.get('recentCommands'))
  const commands = useFilteredCommands('', {
    recentCommands,
    sortActiveCommandsFirst: true,
  })

  // Sync Redux showGestureMenu to gestureStore animation state
  React.useEffect(() => {
    if (showGestureMenu && animationState === 'hidden') {
      // Start enter animation only when menu opens and we're in hidden state
      startGestureMenuEnter()
    } else if (!showGestureMenu && animationState !== 'hidden' && animationState !== 'exiting') {
      // Start exit animation only when menu closes and we're not already hidden or exiting
      startGestureMenuExit()
    }
  }, [showGestureMenu, animationState])

  // Transition from 'entering' to 'visible' to trigger the fade-in animation.
  // Component mounts with in={false} when 'entering', then in={true} when 'visible'.
  React.useEffect(() => {
    if (animationState === 'entering') {
      onGestureMenuEntered()
    }
  }, [animationState])

  // Don't render if hidden
  if (animationState === 'hidden') return null

  // fadeIn is true only when 'visible' - this gives CSSTransition a frame with in={false} when mounting
  const fadeIn = animationState === 'visible'
  return (
    <PopupBase background='transparent' ref={popupRef} fullScreen>
      <div
        data-testid='popup-value'
        className={css({
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'start',
          alignItems: 'center',
          width: '100%',
          position: 'absolute',
          top: 0,
        })}
      >
        <ProgressiveBlur />
        {/* Apply the fade transition only to the glow, overlay, and gesture menu contents 
        to prevent the progressive blur from appearing only after the animation ends. */}
        <FadeTransition
          nodeRef={overlayRef}
          in={fadeIn}
          type='fast'
          unmountOnExit
          onEntered={onGestureMenuEntered}
          onExited={onGestureMenuExited}
        >
          <>
            <div
              className={css({
                background: 'bgOverlay50',
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100vh',
              })}
            />
            <div
              ref={overlayRef}
              className={css({
                position: 'relative',
                // prevent mix-blend-mode and backdrop-filter from affecting each other
                isolation: 'isolate',
                width: '100%',
                paddingBottom: '200px',
              })}
            >
              <Overlay />
              <Glow />
              <GestureMenu commands={commands} />
            </div>
          </>
        </FadeTransition>
      </div>
    </PopupBase>
  )
}

export default GestureMenuWithTransition
