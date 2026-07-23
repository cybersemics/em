import { FC, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import { isBrowser } from '../../browser'
import { gestureString } from '../../commands'
import openMobileCommandUniverseCommand from '../../commands/openMobileCommandUniverse'
import useFilteredCommands from '../../hooks/useFilteredCommands'
import gestureStore, {
  onGestureMenuEntered,
  onGestureMenuExited,
  startGestureMenuEnter,
  startGestureMenuExit,
} from '../../stores/gesture'
import storageModel from '../../stores/storageModel'
import FadeTransition from '../FadeTransition'
import PopupBase from '../PopupBase'
import GestureContentBlur from './GestureContentBlur'
import GestureMenuItem from './GestureMenuItem'
import { GESTURE_MENU_BOTTOM_TAIL_REM, GESTURE_MENU_PADDING_REM, GESTURE_MENU_ROW_GAP_REM } from './constants'

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

  const mainCommands = commands.filter(cmd => cmd.id !== 'cancel' && cmd.id !== 'openMobileCommandUniverse')
  const persistentCommands = commands.filter(cmd => cmd.id === 'cancel' || cmd.id === 'openMobileCommandUniverse')

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '100%',
        overflow: 'hidden',
        maxHeight: `calc(100dvh - ${token('spacing.safeAreaBottom')} - ${token('spacing.safeAreaTop')})`,
        paddingTop: 'safeAreaTop',
        fontFamily: 'radioCanada',
      })}
    >
      <div
        className={css({
          marginBottom: 0,
          textAlign: 'left',
          maxWidth: '100%',
          maxHeight: '100%',
          width: '45.889rem',
          cursor: 'default',
          display: 'flex',
          flexDirection: 'column',
        })}
        style={{ fontSize }}
      >
        {gestureInProgress && (
          <div
            style={{
              padding: `${GESTURE_MENU_PADDING_REM}rem`,
              ...(!isBrowser ? { paddingTop: '0.75rem' } : null),
            }}
          >
            {/* Header */}
            <div className={css({ marginBottom: '1.389rem' })}>
              <div
                style={{
                  color: 'rgb(255, 255, 255, 0.7)',
                  marginBottom: '0.444rem',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }}
              >
                Gestures
              </div>
              <div
                style={{
                  height: '1px',
                  width: '100%',
                  background: 'linear-gradient(90deg, rgba(174, 168, 214, 0.59) 0%, rgba(28, 27, 36, 0) 100%)',
                }}
              />
            </div>

            {/* Main commands */}
            <div
              className={css({
                display: 'flex',
                flexDirection: 'column',
              })}
              style={{ gap: `${GESTURE_MENU_ROW_GAP_REM}rem` }}
            >
              {mainCommands.map((command, index) => (
                <GestureMenuItem
                  gestureInProgress={gestureInProgress as string}
                  key={command.id}
                  selected={gestureInProgress === gestureString(command)}
                  command={command}
                  isFirstCommand={index === 0}
                  isLastCommand={index === mainCommands.length - 1}
                />
              ))}
            </div>
            {/* Cancel / Cheatsheet block */}
            {persistentCommands.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: !mainCommands.length ? 0 : '2.15rem',
                  gap: `${GESTURE_MENU_ROW_GAP_REM}rem`,
                }}
              >
                {persistentCommands.map((command, index) => {
                  const mobileCommandUniverseInProgress = gestureInProgress
                    ?.toString()
                    .endsWith(gestureString(openMobileCommandUniverseCommand))
                  const isMobileCommandUniverseMatch =
                    command.id === 'openMobileCommandUniverse' && mobileCommandUniverseInProgress
                  const isCancelMatch =
                    command.id === 'cancel' && !hasMatchingCommand && !mobileCommandUniverseInProgress

                  return (
                    <GestureMenuItem
                      gestureInProgress={gestureInProgress as string}
                      key={command.id}
                      selected={
                        isMobileCommandUniverseMatch || gestureInProgress === gestureString(command) || isCancelMatch
                      }
                      command={command}
                      isFirstCommand={index === 0}
                      isLastCommand={index === persistentCommands.length - 1}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Renders the glow effect for the gesture menu. */
function Glow() {
  return (
    <div
      data-testid='glow-background'
      className={css({
        position: 'absolute',
        pointerEvents: 'none',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
      })}
    >
      <div
        className={css({
          backgroundImage: 'url(/img/gesture-menu/glow.avif)',
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
        background: 'linear-gradient(180deg, {colors.black} 0%, {colors.bgOverlay80} 70%, {colors.bgTransparent} 100%)',
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

  const [isGlowBackgroundLoaded, setIsGlowBackgroundLoaded] = useState(false)

  // Sync Redux showGestureMenu to gestureStore animation state
  useEffect(() => {
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
  useEffect(() => {
    if (animationState === 'entering') {
      onGestureMenuEntered()
    }
  }, [animationState])

  useEffect(() => {
    /** Prefetch the gesture menu glow background image to improve initial menu appearance. */
    const prefetchGlowBackground = async () => {
      const img = new Image()
      img.src = '/img/gesture-menu/glow.avif'
      await img.decode()
    }

    prefetchGlowBackground().finally(() => setIsGlowBackgroundLoaded(true))
  }, [])

  // fadeIn is true only when 'visible' - this gives CSSTransition a frame with in={false} when mounting
  const fadeIn = animationState === 'visible'

  // Don't render if hidden
  if (animationState === 'hidden') return null

  return (
    <>
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
          {/* Apply the fade transition only to the glow, overlay, and gesture menu contents
            to prevent them from appearing only after the animation ends. */}
          <FadeTransition nodeRef={overlayRef} in={fadeIn} type='fast' unmountOnExit onExited={onGestureMenuExited}>
            <div
              ref={overlayRef}
              className={css({
                position: 'relative',
                // prevent mix-blend-mode and backdrop-filter from affecting each other
                isolation: 'isolate',
                width: '100%',
                maxHeight: '100dvh',
                // Keeps the compositor layer alive so Android WebView doesn't drop the subtree for a
                // frame at fade end, flashing the sibling GestureContentBlur blur through the menu.
                willChange: 'opacity',
              })}
              // paddingBottom sourced from GestureMenu/constants (shared with the content-blur tail).
              style={{ paddingBottom: `${GESTURE_MENU_BOTTOM_TAIL_REM}rem` }}
            >
              <Overlay />
              {isGlowBackgroundLoaded && <Glow />}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <GestureMenu commands={commands} />
              </div>
            </div>
          </FadeTransition>
        </div>
      </PopupBase>
      {/* Sibling of PopupBase (not a child) so its gestureContentBlur z-index is ordered in the shared
          <View> stacking context — below the trace, above the content — rather than being trapped inside
          PopupBase's higher 'popup' stacking context. */}
      <GestureContentBlur />
    </>
  )
}

export default GestureMenuWithTransition
