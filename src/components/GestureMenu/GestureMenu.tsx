import { FC, PropsWithChildren, useEffect, useRef, useState } from 'react'
import { useSelector, useStore } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import { commandById, gestureString } from '../../commands'
import openMobileCommandUniverseCommand from '../../commands/openMobileCommandUniverse'
import * as selection from '../../device/selection'
import useFilteredCommands from '../../hooks/useFilteredCommands'
import useGestureMenuLayout, {
  COLUMN_GAP_REM,
  HEADER_BLOCK_MARGIN_BOTTOM_REM,
  HEADER_FONT_SIZE_REM,
  HEADER_TITLE_MARGIN_BOTTOM_REM,
  ROW_GAP_REM,
} from '../../hooks/useGestureMenuLayout'
import isCommandDiscovered from '../../selectors/isCommandDiscovered'
import isTutorial from '../../selectors/isTutorial'
import gestureStore, {
  onGestureMenuEntered,
  onGestureMenuExited,
  startGestureMenuEnter,
  startGestureMenuExit,
} from '../../stores/gestureStore'
import storageModel from '../../stores/storageModel'
import FadeTransition from '../FadeTransition'
import DiscoveryBase from '../Learning/DiscoveryBase'
import PopupBase from '../PopupBase'
import GestureContentBlur from './GestureContentBlur'
import GestureMenuItem from './GestureMenuItem'

/**********************************************************************
 * Components
 **********************************************************************/

/** Render a gesture menu with gesture autocomplete. */
const GestureMenu: FC<{
  commands: Command[]
  /** The menu's one undiscovered command, drawn as a ghost. See useDiscoveredCommands. */
  ghost?: Command
}> = ({ commands, ghost }) => {
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
        ghost={command === ghost}
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
                  color: token('colors.gestureMenuLabel'),
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
      className={css({
        position: 'absolute',
        pointerEvents: 'none',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
      })}
    >
      <div
        data-testid='glow-background'
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

/** How long the menu's background takes to give way to Command Discovery's while the gesture matches the ghost, in ms. */
const GHOST_BASE_FADE = 250

/**
 * While the gesture matches the undiscovered command, the menu's own background gives way to the picture Command
 * Discovery plays over (DiscoveryBase): the app dimmed, and the light waiting above the screen. Discovering the command
 * then begins on the same picture, and only the light moves. `show` fades it in, and `children`, the menu's own
 * background, out.
 */
function GhostBase({ show, children }: PropsWithChildren<{ show: boolean }>) {
  const transition = `opacity ${GHOST_BASE_FADE}ms ease-in-out`
  return (
    <>
      <div style={{ opacity: show ? 0 : 1, transition }}>{children}</div>
      <div
        className={css({ pointerEvents: 'none', position: 'absolute', top: 0, width: '100%', height: '100dvh' })}
        style={{ opacity: show ? 1 : 0, transition }}
      >
        <DiscoveryBase />
      </div>
    </>
  )
}

/**
 * Splits the commands that match the gesture into what the Gesture Menu shows: the discovered ones, and a single
 * undiscovered one as a ghost, placed after them and before Cancel and Command Universe. The first undiscovered command
 * is the ghost, which is the one the gesture matches exactly if there is one, since an exact match sorts first.
 * Chained commands are never ghosts. During the tutorial every command is shown, since it teaches by gesture.
 */
const useDiscoveredCommands = (commands: Command[]): { commands: Command[]; ghost: Command | undefined } => {
  const store = useStore()
  // Re-renders when a command is discovered or the tutorial ends.
  useSelector(state => state.learning.discovered)
  const showAll = useSelector(isTutorial)
  // The command being discovered stays the ghost while the menu fades out over Command Discovery. It is discovered by
  // then, and would otherwise be redrawn mid-fade as an ordinary row, with its description, pushing the rows below it
  // down.
  const discovering = useSelector(state => state.commandDiscovery)
  if (showAll) return { commands, ghost: undefined }

  const state = store.getState()
  /** Whether the menu lists a command as discovered. */
  const listed = (command: Command) => isCommandDiscovered(state, command.id) && command.id !== discovering
  const shown = commands.filter(listed)
  const ghost = commands.find(command => !listed(command) && commandById(command.id) === command)
  if (!ghost) return { commands: shown, ghost }
  const fixedIndex = shown.findIndex(command => command.id === 'cancel' || command.id === 'openMobileCommandUniverse')
  const index = fixedIndex === -1 ? shown.length : fixedIndex
  return { commands: [...shown.slice(0, index), ghost, ...shown.slice(index)], ghost }
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

/** Hides the native text selection (and the iOS selection callout / edit menu) while the gesture menu is onscreen, then restores it when the menu is dismissed. The range is removed rather than cleared so that focus and the editor state (e.g. the mobile keyboard) are preserved, and saved so a cancelled gesture leaves the selection exactly as it was. */
const useHideSelection = (hide: boolean) => {
  // Holds the text selection range while the gesture menu is open so it can be restored when the menu is dismissed.
  const savedRangeRef = useRef<selection.SavedRange | null>(null)

  useEffect(() => {
    if (hide) {
      // Only a non-collapsed selection renders the callout. Removing a collapsed caret would disturb the editor mid-gesture, which on iOS aborts the gesture before its command executes.
      savedRangeRef.current = selection.isCollapsed() ? null : selection.saveRange()
      if (savedRangeRef.current) selection.removeRanges()
    } else if (savedRangeRef.current) {
      selection.restoreRange(savedRangeRef.current)
      savedRangeRef.current = null
    }
  }, [hide])
}

/** A GestureMenu component that fades in and out based on state.showGestureMenu. */
const GestureMenuWithTransition: FC = () => {
  const popupRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const showGestureMenu = useSelector(state => state.showGestureMenu)
  const animationState = gestureStore.useSelector(state => state.gestureMenuAnimationState)

  // Commands need to be calculated even if the gesture menu is not shown because useFilteredCommands is responsible for updating gestureStore's possibleCommands which is needed to prevent haptics when there are no more possible commands. Otherwise, either haptics would continue to fire when there are no more possible commands, or would falsely fire when the current sequence is not a valid gesture but there are possible commands with additional swipes.
  const [recentCommands] = useState(storageModel.get('recentCommands'))
  const matchingCommands = useFilteredCommands('', {
    recentCommands,
    sortActiveCommandsFirst: true,
  })
  // The hook above still sees every command, for haptics; the menu itself lists only the discovered ones and a ghost.
  const { commands, ghost } = useDiscoveredCommands(matchingCommands)
  const gestureInProgress = gestureStore.useSelector(state => state.gesture)
  const ghostSelected = !!ghost && gestureInProgress === gestureString(ghost)

  useHideSelection(showGestureMenu)

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

  // fadeIn is true only when 'visible' - this gives CSSTransition a frame with in={false} when mounting
  const fadeIn = animationState === 'visible'

  // Don't render if hidden
  if (animationState === 'hidden') return null

  return (
    <>
      {/* The gesture menu is a display, never a touch target. It closes once a gesture ends, so a new touch can begin over it just before or while it fades out, and the browser pins a touch to its touchstart target: when the menu unmounts, the touch's remaining touchmoves and touchend go to the detached tree and its swipe is never recognized. Touches pass through to the content beneath, which is inside MultiGesture, so a gesture traced over the menu is still recognized. */}
      <div className={css({ pointerEvents: 'none' })}>
        <PopupBase background='transparent' ref={popupRef} fullScreen layer='gestureMenu'>
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
                <GhostBase show={ghostSelected}>
                  <Overlay />
                  <Glow />
                </GhostBase>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <GestureMenu commands={commands} ghost={ghost} />
                </div>
              </div>
            </FadeTransition>
          </div>
        </PopupBase>
      </div>
      {/* Sibling of PopupBase (not a child) so its gestureContentBlur z-index is ordered in the shared
          <View> stacking context — below the trace, above the content — rather than being trapped inside
          PopupBase's higher 'gestureMenu' stacking context. */}
      <GestureContentBlur />
    </>
  )
}

export default GestureMenuWithTransition
