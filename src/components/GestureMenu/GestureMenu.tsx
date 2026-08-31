import { FC, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import { gestureString } from '../../commands'
import openMobileCommandUniverseCommand from '../../commands/openMobileCommandUniverse'
import useFilteredCommands from '../../hooks/useFilteredCommands'
import useGestureMenuLayout, {
  COLUMN_GAP_REM,
  HEADER_BLOCK_MARGIN_BOTTOM_REM,
  HEADER_FONT_SIZE_REM,
  HEADER_TITLE_MARGIN_BOTTOM_REM,
  ROW_GAP_REM,
} from '../../hooks/useGestureMenuLayout'
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

  const {
    columnCount,
    maxColumns,
    columnWidth,
    dividerWidth,
    horizontalPaddingRem,
    paddingTopRem,
    verticalPaddingRem,
    rowsPerColumn,
    visibleCommandCount,
    isMultiColumn,
  } = useGestureMenuLayout(commands.length)

  // Only the grid trims; the single-column stack renders every command and scrolls instead.
  const visibleCommands = isMultiColumn ? commands.slice(0, visibleCommandCount) : commands

  /**
   * Whether a command's row renders as selected. Every command is selected by an exact gesture match;
   * Cancel and Command Universe additionally answer to the states that have no exact match of their
   * own — Command Universe to its gesture appearing as a *suffix* of the gesture in progress, and
   * Cancel to a gesture that matches nothing at all. They are ordinary rows in every other respect.
   */
  const isSelected = (command: Command) => {
    if (gestureInProgress === gestureString(command)) return true
    const mobileCommandUniverseInProgress = gestureInProgress
      ?.toString()
      .endsWith(gestureString(openMobileCommandUniverseCommand))
    if (command.id === 'openMobileCommandUniverse') return !!mobileCommandUniverseInProgress
    if (command.id === 'cancel') return !hasMatchingCommand && !mobileCommandUniverseInProgress
    return false
  }

  /** Renders command rows. Auto-scroll is only enabled in the single-column (scrolling) layout. */
  const renderCommands = (items: Command[]) =>
    items.map((command, index) => (
      <GestureMenuItem
        gestureInProgress={gestureInProgress as string}
        key={command.id}
        selected={isSelected(command)}
        command={command}
        isFirstCommand={index === 0}
        isLastCommand={index === items.length - 1}
        autoScroll={!isMultiColumn}
      />
    ))

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
        style={{ fontSize }}
      >
        {gestureInProgress && (
          <div
            data-testid='gesture-menu-content'
            style={{
              paddingBlock: `${verticalPaddingRem}rem`,
              paddingInline: `${horizontalPaddingRem}rem`,
              paddingTop: `${paddingTopRem}rem`,
              paddingLeft: `calc(${horizontalPaddingRem}rem + ${token.var('spacing.safeAreaLeft')})`,
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: `${HEADER_BLOCK_MARGIN_BOTTOM_REM}rem` }}>
              <div
                style={{
                  color: 'gestureMenuTitle',
                  marginBottom: `${HEADER_TITLE_MARGIN_BOTTOM_REM}rem`,
                  fontSize: `${HEADER_FONT_SIZE_REM}rem`,
                  fontWeight: 500,
                }}
              >
                Gestures
              </div>
              <div
                className={css({
                  height: '1px',
                  background: 'linear-gradient(90deg, {colors.gestureMenuDivider} 0%, {colors.bgTransparent} 100%)',
                })}
                style={{ width: dividerWidth }}
              />
            </div>

            {isMultiColumn ? (
              /* Multi-column grid: commands flow top-to-bottom then left-to-right and own every column.
                 Cancel and Command Universe are simply the last two entries, so they land wherever the
                 packing puts them — including split across a column boundary. */
              <div
                style={{
                  display: 'grid',
                  // Track count comes from what fits, not what's used, so the tracks keep their width
                  // as commands drop away; unused tracks simply render empty.
                  gridTemplateColumns: `repeat(${maxColumns}, minmax(0, 1fr))`,
                  columnGap: `${COLUMN_GAP_REM}rem`,
                }}
              >
                {/* Split the commands into column-major chunks (top-to-bottom then left-to-right)
                   and render each column as its own nested grid. Per-column row tracks — rather
                   than one shared set of tracks — keep a selected command's description from
                   inflating the matching row in sibling columns. */}
                {Array.from({ length: columnCount }, (_, columnIndex) =>
                  visibleCommands.slice(columnIndex * rowsPerColumn, (columnIndex + 1) * rowsPerColumn),
                ).map((columnCommands, columnIndex) => (
                  <div key={columnIndex} style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'grid',
                        // Auto rows (rather than a fixed repeat(rowsPerColumn)) so a short last column
                        // is only as tall as its own items, with no trailing empty tracks.
                        gridAutoRows: 'min-content',
                        rowGap: `${ROW_GAP_REM}rem`,
                      }}
                    >
                      {renderCommands(columnCommands)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Single column: a plain flex stack rather than a grid. Above md it is held to the same
                 columnWidth the grid tracks use, so collapsing from two columns to one leaves the
                 surviving column exactly where and how wide it was. */
              <div style={{ width: columnWidth }}>
                <div
                  className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.2rem',
                  })}
                >
                  {renderCommands(visibleCommands)}
                </div>
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
        background: 'linear-gradient(180deg, {colors.black} 0%, {colors.bgOverlay80} 60%, {colors.bgOverlay50} 100%)',
        top: 0,
        width: '100%',
        height: '100dvh',
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
                paddingBottom: '11.111rem',
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
      {/* Sibling of PopupBase (not a child) so its gestureContentBlur z-index is ordered in the shared
          <View> stacking context — below the trace, above the content — rather than being trapped inside
          PopupBase's higher 'popup' stacking context. */}
      <GestureContentBlur />
    </>
  )
}

export default GestureMenuWithTransition
