import { FC, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import { isBrowser } from '../../browser'
import { gestureString } from '../../commands'
import openMobileCommandUniverseCommand from '../../commands/openMobileCommandUniverse'
import useFilteredCommands from '../../hooks/useFilteredCommands'
import useGestureMenuLayout, {
  GESTURE_MENU_COLUMN_GAP_REM,
  GESTURE_MENU_HEADER_LABEL_FONT_SIZE_REM,
  GESTURE_MENU_HEADER_LABEL_MARGIN_BOTTOM_REM,
  GESTURE_MENU_HEADER_MARGIN_BOTTOM_REM,
  GESTURE_MENU_ROW_GAP_REM,
  fogDepthAt,
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

  const { columnCount, maxColumns, horizontalPaddingRem, verticalPaddingRem, rowsPerColumn, visibleCommandCount } =
    useGestureMenuLayout(commands.length)

  // Both paddings come from the hook rather than being re-derived here, so what the panel renders is
  // always what the hook's width and height budgets were computed against. They key on how many columns
  // *fit* — never on how many the commands happen to need — so refining a gesture (r → rdl) can drop a
  // column without shifting the panel's padding.
  const horizontalPadding = `${horizontalPaddingRem}rem`
  const verticalPadding = `${verticalPaddingRem}rem`

  const isSingleColumnMobile = maxColumns === 1 && !isBrowser

  // The width of one column, derived from how many columns *fit* rather than how many are in use, so it
  // is constant for a given viewport. This is what keeps the menu from resizing as a gesture narrows the
  // command list: `r` may fill two columns and `rdl` only one, but each column is the same width in both.
  const columnWidth = `calc((100% - ${(maxColumns - 1) * GESTURE_MENU_COLUMN_GAP_REM}rem) / ${maxColumns})`

  // The layout caps instead of scrolling, so it trims to what the hook budgeted.
  const visibleCommands = commands.slice(0, visibleCommandCount)

  // Fog the trailing rows when one column is all that *fits* and the cap is hiding commands (issue #3801
  // §4). Keyed on maxColumns rather than columnCount for the reason the paddings are: if the viewport
  // could open another column, the overflow would go there instead of into the fog. Under overflow the
  // two are equal anyway — overflow means packing was capped by width — so this is the same condition
  // stated as its cause. A grid that fits more than one column never fogs; it drops the overflow.
  const fogsOverflow = maxColumns === 1 && visibleCommandCount < commands.length

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

  /**
   * Renders command rows. The layout caps its visible rows instead of scrolling, so no row scrolls itself
   * into view. When `fog` is set, the last GESTURE_MENU_FOG_ROW_COUNT rows fade into the fog to signal
   * hidden commands.
   */
  const renderCommands = (items: Command[], { fog = false }: { fog?: boolean } = {}) =>
    items.map((command, index) => {
      const distanceFromEnd = items.length - 1 - index
      const fogDepth = fog ? fogDepthAt(distanceFromEnd) : 0
      return (
        <GestureMenuItem
          gestureInProgress={gestureInProgress as string}
          key={command.id}
          selected={isSelected(command)}
          command={command}
          isFirstCommand={index === 0}
          fogDepth={fogDepth}
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
        height: `calc(100dvh - ${token('spacing.safeAreaBottom')} - ${token('spacing.safeAreaTop')})`,
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
        // Width is bounded by `columnWidth` on the column itself, so no fixed content-width cap here.
        style={{ fontSize }}
      >
        {gestureInProgress && (
          <div
            style={{
              paddingBlock: verticalPadding,

              paddingInline: horizontalPadding,
              paddingTop: isSingleColumnMobile ? '0.75rem' : undefined,
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: `${GESTURE_MENU_HEADER_MARGIN_BOTTOM_REM}rem` }}>
              <div
                className={css({
                  color: 'gestureMenuLabel',
                })}
                style={{
                  marginBottom: `${GESTURE_MENU_HEADER_LABEL_MARGIN_BOTTOM_REM}rem`,
                  fontSize: `${GESTURE_MENU_HEADER_LABEL_FONT_SIZE_REM}rem`,
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
                // The divider always spans exactly one column, matching the Figma frames. Where only one
                // column fits, columnWidth already resolves to the full panel width, so the same
                // expression covers both cases.
                style={{ width: columnWidth }}
              />
            </div>

            {/* One grid at every viewport. Commands flow top-to-bottom then left-to-right and own every
                column; Cancel and Command Universe are simply the last two entries, so they land wherever
                the packing puts them — including split across a column boundary. A single column is this
                same grid with one occupied track, not a separate flex stack: the track supplies exactly
                the width the stack used to set by hand, so the two are the same layout and cannot drift. */}
            <div
              style={{
                display: 'grid',
                // Track count comes from what fits, not what's used, so the tracks keep their width
                // as commands drop away; unused tracks simply render empty.
                gridTemplateColumns: `repeat(${maxColumns}, minmax(0, 1fr))`,
                columnGap: `${GESTURE_MENU_COLUMN_GAP_REM}rem`,
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
                      rowGap: `${GESTURE_MENU_ROW_GAP_REM}rem`,
                    }}
                  >
                    {renderCommands(columnCommands, { fog: fogsOverflow })}
                  </div>
                </div>
              ))}
            </div>
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
