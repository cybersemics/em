import { FC, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import { isBrowser } from '../browser'
import { gestureString } from '../commands'
import openMobileCommandUniverseCommand from '../commands/openMobileCommandUniverse'
import useFilteredCommands from '../hooks/useFilteredCommands'
import useGestureMenuLayout, {
  GESTURE_MENU_COLUMN_GAP_REM,
  GESTURE_MENU_GROUP_GAP_REM,
  GESTURE_MENU_PANEL_PADDING_MD_REM,
  GESTURE_MENU_PANEL_PADDING_REM,
  GESTURE_MENU_ROW_GAP_REM,
} from '../hooks/useGestureMenuLayout'
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

  const { columnCount, rowsPerColumn, visibleRegularCount, persistentColumnIndex, persistentInline } =
    useGestureMenuLayout(mainCommands.length, persistentCommands.length)
  const isMultiColumn = columnCount > 1

  // 5rem panel padding for the multi-column layout (per the Figma mockups), 2.25rem for single column
  // (mobile portrait, or narrow landscape above md that only fits one column).
  const horizontalPadding = `${isMultiColumn ? GESTURE_MENU_PANEL_PADDING_MD_REM : GESTURE_MENU_PANEL_PADDING_REM}rem`

  // In a multi-column layout the divider spans only the first column; single column spans the full width.
  const dividerWidth = isMultiColumn
    ? `calc((100% - ${(columnCount - 1) * GESTURE_MENU_COLUMN_GAP_REM}rem) / ${columnCount})`
    : '100%'

  const visibleMainCommands = isMultiColumn ? mainCommands.slice(0, visibleRegularCount) : mainCommands

  /** Renders the regular command rows. Auto-scroll is only enabled in the single-column (scrolling) layout. */
  const renderMainCommands = (items: Command[]) =>
    items.map((command, index) => (
      <GestureMenuItem
        gestureInProgress={gestureInProgress as string}
        key={command.id}
        selected={gestureInProgress === gestureString(command)}
        command={command}
        isFirstCommand={index === 0}
        isLastCommand={index === items.length - 1}
        autoScroll={!isMultiColumn}
      />
    ))

  /**
   * Render the persistent commands (Cancel / Command Universe). `horizontal` is true for the
   * full-width bottom row, where the items sit side by side: there every item must reserve the same
   * top padding as a first row, otherwise only the first item gets `isFirstCommand` padding and the
   * rest ride higher, misaligning the row. In the vertical inline block only the top item is first.
   */
  const renderPersistentItems = (horizontal: boolean) =>
    persistentCommands.map((command, index) => {
      const mobileCommandUniverseInProgress = gestureInProgress
        ?.toString()
        .endsWith(gestureString(openMobileCommandUniverseCommand))
      const isMobileCommandUniverseMatch = command.id === 'openMobileCommandUniverse' && mobileCommandUniverseInProgress
      const isCancelMatch = command.id === 'cancel' && !hasMatchingCommand && !mobileCommandUniverseInProgress

      return (
        <GestureMenuItem
          gestureInProgress={gestureInProgress as string}
          key={command.id}
          selected={isMobileCommandUniverseMatch || gestureInProgress === gestureString(command) || isCancelMatch}
          command={command}
          isFirstCommand={horizontal || index === 0}
          isLastCommand={index === persistentCommands.length - 1}
          autoScroll={!isMultiColumn}
        />
      )
    })

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
          cursor: 'default',
          display: 'flex',
          flexDirection: 'column',
        })}
        // Drop the fixed content-width cap above md — descriptions are bounded by the column width there.
        style={{ fontSize, width: isMultiColumn ? undefined : '45.889rem' }}
      >
        {gestureInProgress && (
          <div
            className={css({
              paddingBlock: '2.25rem',
            })}
            style={{
              paddingInline: horizontalPadding,
              paddingTop: !isBrowser ? '0.75rem' : undefined,
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
                  width: dividerWidth,
                  background: 'linear-gradient(90deg, rgba(174, 168, 214, 0.59) 0%, rgba(28, 27, 36, 0) 100%)',
                }}
              />
            </div>

            {isMultiColumn ? (
              /* Multi-column grid: main commands flow top-to-bottom then left-to-right and own every
                 column. When there's slack (persistentInline) the persistent commands sit inline at
                 the bottom of the last column; otherwise they fall back to a full-width row below. */
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                    columnGap: `${GESTURE_MENU_COLUMN_GAP_REM}rem`,
                  }}
                >
                  {/* Split the commands into column-major chunks (top-to-bottom then left-to-right)
                     and render each column as its own nested grid. Per-column row tracks — rather
                     than one shared set of tracks — keep a selected command's description from
                     inflating the matching row in sibling columns. */}
                  {Array.from({ length: columnCount }, (_, columnIndex) =>
                    visibleMainCommands.slice(columnIndex * rowsPerColumn, (columnIndex + 1) * rowsPerColumn),
                  ).map((columnCommands, columnIndex) => {
                    // The inline persistent block is appended below the last column that holds main
                    // commands (persistentColumnIndex), so it never sits in its own empty column.
                    const showInlinePersistent =
                      persistentInline && persistentCommands.length > 0 && columnIndex === persistentColumnIndex
                    return (
                      <div key={columnIndex} style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: 'grid',
                            // Auto rows (rather than a fixed repeat(rowsPerColumn)) so a column with
                            // fewer commands than its siblings — e.g. the last column when persistent
                            // commands flow inline — is only as tall as its own items, with no trailing
                            // empty tracks pushing the inline persistent block down.
                            gridAutoRows: 'min-content',
                            rowGap: `${GESTURE_MENU_ROW_GAP_REM}rem`,
                          }}
                        >
                          {renderMainCommands(columnCommands)}
                        </div>
                        {showInlinePersistent && (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              // Drop the group gap when this column has no main commands to separate from.
                              marginTop: columnCommands.length === 0 ? 0 : `${GESTURE_MENU_GROUP_GAP_REM}rem`,
                              gap: `${GESTURE_MENU_ROW_GAP_REM}rem`,
                            }}
                          >
                            {renderPersistentItems(false)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {!persistentInline && persistentCommands.length > 0 && (
                  <div
                    style={{
                      marginTop: visibleMainCommands.length === 0 ? 0 : `${GESTURE_MENU_GROUP_GAP_REM}rem`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        columnGap: `${GESTURE_MENU_COLUMN_GAP_REM}rem`,
                      }}
                    >
                      {renderPersistentItems(true)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Single column (mobile portrait or narrow landscape): unchanged flex layout. */
              <>
                <div
                  className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.2rem',
                  })}
                >
                  {renderMainCommands(mainCommands)}
                </div>
                {persistentCommands.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      marginTop: !mainCommands.length ? 0 : '2.15rem',
                      gap: '1.2rem',
                    }}
                  >
                    {renderPersistentItems(false)}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Renders a blur effect overlay for the gesture menu. */
function ProgressiveBlur() {
  const animationState = gestureStore.useSelector(state => state.gestureMenuAnimationState)

  return (
    <div
      className={css({
        pointerEvents: 'none',
        position: 'absolute',
        backdropFilter: 'blur(5px)',
        mask: 'linear-gradient(180deg, {colors.black} 0%, {colors.bgOverlay80} 80%, {colors.bgTransparent} 100%)',
        width: '100%',
        top: 0,
        height: '100%',
      })}
      style={{
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

  // Don't render if hidden
  if (animationState === 'hidden') return null

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
        <FadeTransition nodeRef={overlayRef} in={fadeIn} type='fast' unmountOnExit onExited={onGestureMenuExited}>
          <div
            ref={overlayRef}
            className={css({
              position: 'relative',
              // prevent mix-blend-mode and backdrop-filter from affecting each other
              isolation: 'isolate',
              width: '100%',
              paddingBottom: '11.111rem',
              maxHeight: '100dvh',
            })}
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
  )
}

export default GestureMenuWithTransition
