import { FC, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import { isBrowser } from '../browser'
import { gestureString } from '../commands'
import openMobileCommandUniverseCommand from '../commands/openMobileCommandUniverse'
import useFilteredCommands from '../hooks/useFilteredCommands'
import gestureStore, {
  onGestureMenuEntered,
  onGestureMenuExited,
  startGestureMenuEnter,
  startGestureMenuExit,
} from '../stores/gesture'
import storageModel from '../stores/storageModel'
import FadeTransition from './FadeTransition'
import GestureMenuItem from './GestureMenuItem'
import PopupBase from './PopupBase'

/**********************************************************************
 * Blur height metrics
 *
 * The ProgressiveBlur is decoupled from the gesture menu popup so the gesture trace can sit above it (see
 * docs/superpowers/specs/2026-06-26-gesture-trace-above-blur-zindex.md). Because it no longer inherits its height from
 * the menu container, the height is derived from the command count. These constants reproduce the height the blur used
 * to inherit: the menu content plus the FadeTransition wrapper's paddingBottom tail (where the mask feathers out).
 * They are approximate — a selected row is taller (it adds a description) — but the mask gradient feathers the bottom
 * edge so exact pixels are not required. Tune by eye if the blur visibly under- or over-shoots the menu.
 **********************************************************************/

/** Command label line height (fontSize 0.95rem × lineHeight 1em). Keep in sync with the GestureMenuItem label styling. */
const GESTURE_MENU_ROW_LABEL_REM = 0.95
/** Gap between command rows. Keep in sync with the main-commands `gap` in GestureMenu. */
const GESTURE_MENU_ROW_GAP_REM = 1.2
/** Header ("Gestures" label + divider + margin) above the command list, in rem. */
const GESTURE_MENU_HEADER_REM = 4.0
/** Top + bottom padding of the menu content block (2.25rem each; top is reduced to 0.75rem in the native app), in rem. */
const GESTURE_MENU_VERTICAL_PADDING_REM = 4.5
/** Bottom tail below the last command. Shared with the FadeTransition wrapper's paddingBottom (see GestureMenuWithTransition) so the two stay in sync (~200px). The mask gradient feathers the blur out across this tail. */
const GESTURE_MENU_BOTTOM_TAIL_REM = 11.111

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
            className={css({
              padding: '2.25rem',
              paddingTop: !isBrowser ? '0.75rem' : undefined,
            })}
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
                gap: '1.2rem',
              })}
            >
              {mainCommands.map((command, index) => {
                // Check if the current gesture sequence ends with help gesture
                const mobileCommandUniverseInProgress = gestureInProgress
                  ?.toString()
                  .endsWith(gestureString(openMobileCommandUniverseCommand))
                const isMobileCommandUniverseMatch =
                  command.id === 'openMobileCommandUniverse' && mobileCommandUniverseInProgress
                const isCancelMatch = command.id === 'cancel' && !hasMatchingCommand && !mobileCommandUniverseInProgress

                return (
                  <GestureMenuItem
                    gestureInProgress={gestureInProgress as string}
                    key={command.id}
                    selected={
                      isMobileCommandUniverseMatch || gestureInProgress === gestureString(command) || isCancelMatch
                    }
                    command={command}
                    isFirstCommand={index === 0}
                    isLastCommand={index === mainCommands.length - 1}
                  />
                )
              })}
            </div>
            {/* Cancel / Cheatsheet block */}
            {persistentCommands.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: !mainCommands.length ? 0 : '2.15rem',
                  gap: '1.2rem',
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

/**
 * Renders the blur effect overlay for the gesture menu. Rendered as a sibling of (not a child of) the menu's PopupBase
 * and placed on the `gestureMenuBlur` z-index — just below `gestureTrace` — so the gesture trace sits above the blur
 * (darkened by the menu overlay, but not blurred). Uses `position: fixed` since it no longer has the menu container as a
 * positioned ancestor; height is derived from the command count.
 */
function ProgressiveBlur({ height }: { height: string }) {
  const animationState = gestureStore.useSelector(state => state.gestureMenuAnimationState)

  return (
    <div
      className={css({
        pointerEvents: 'none',
        position: 'fixed',
        zIndex: 'gestureMenuBlur',
        backdropFilter: 'blur(5px)',
        mask: 'linear-gradient(180deg, {colors.black} 0%, {colors.bgOverlay80} 80%, {colors.bgTransparent} 100%)',
        width: '100%',
        top: 0,
        left: 0,
      })}
      style={{
        height,
        // Use ease-out on enter so the blur appears immediately, and easeInSlow on exit so it lingers before fading.
        transition: `opacity ${token('durations.fast')} ${animationState === 'exiting' ? token('easings.easeInSlow') : 'ease-out'}`,
        opacity: animationState === 'visible' ? 1 : 0,
      }}
    />
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

  // Derive the blur height from the command count so it covers the menu region without inheriting height from the
  // popup (the blur is now a sibling of PopupBase rather than a child). See the blur height metrics above.
  const blurHeight = `${
    GESTURE_MENU_VERTICAL_PADDING_REM +
    GESTURE_MENU_HEADER_REM +
    commands.length * (GESTURE_MENU_ROW_LABEL_REM + GESTURE_MENU_ROW_GAP_REM) +
    GESTURE_MENU_BOTTOM_TAIL_REM
  }rem`

  // Don't render if hidden
  if (animationState === 'hidden') return null

  return (
    <>
      {/* Rendered as a sibling of PopupBase (not a child) and on the `gestureMenuBlur` z-index so the gesture trace
      sits above the blur. */}
      <ProgressiveBlur height={blurHeight} />
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
              })}
              // paddingBottom is set inline (not via css()) so it can share GESTURE_MENU_BOTTOM_TAIL_REM with the blur
              // height formula. Panda only extracts static values at build time, so a variable inside css() would emit no rule.
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
    </>
  )
}

export default GestureMenuWithTransition
