import _ from 'lodash'
import { MotionValue, motion, useTransform } from 'motion/react'
import pluralize from 'pluralize'
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Sheet, SheetRef, useScrollPosition } from 'react-modal-sheet'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { clearMulticursorsActionCreator as clearMulticursors } from '../../actions/clearMulticursors'
import { toggleDropdownActionCreator as toggleDropdown } from '../../actions/toggleDropdown'
import { isTouch } from '../../browser'
import categorize from '../../commands/categorize'
import copyCursorCommand from '../../commands/copyCursor'
import deleteCommand from '../../commands/delete'
import favorite from '../../commands/favorite'
import indent from '../../commands/indent'
import note from '../../commands/note'
import outdent from '../../commands/outdent'
import swapParent from '../../commands/swapParent'
import uncategorize from '../../commands/uncategorize'
import isTutorial from '../../selectors/isTutorial'
import durations from '../../util/durations'
import fastClick from '../../util/fastClick'
import ChevronImg from '../ChevronImg'
import CommandTable from '../CommandTable'
import PanelCommand from './PanelCommand'
import PanelCommandGroup from './PanelCommandGroup'

/** Close to MUI easeOut, but with a 20% head start to catch up with the finger. Otherwise it feels sluggish. The animation can't start until touchend, so we can't afford to smoothly animate from 0. */
const easeOpen = [0.1, 0.2, 0.2, 1] as const
/** MUI sharp — matches the close curve used by SwipeableDrawer. Slow first frame avoids a large initial gap. */
const easeClose = [0.4, 0, 0.6, 1] as const

/**************************************************************
 * Sheet stage constants
 **************************************************************/
/** Snap index of the standard stage. Index 0 is the closed state, which the Sheet turns into onClose. */
const SNAP_STANDARD = 1
/** Snap index of the expanded stage. */
const SNAP_EXPANDED = 2

/** The height offset between the standard and expanded stages. */
const STAGE_OFFSET_REM = 2.78

/**************************************************************
 * Chevron section constants
 **************************************************************/

/** The height of Chevron section. */
const CHEVRON_SECTION_HEIGHT_REM = 1.56

/** Dimensions of the chevron path in px. */
const CHEVRON_WIDTH = 25
const CHEVRON_HEIGHT = 7
const CHEVRON_STROKE = 5

/** Colour of the chevron. Translucent enough that the drawer's backdrop reads through the mark itself, matching the design, where it is a 53% white stroke inside a layer at 23% opacity. */
const CHEVRON_COLOR = token('colors.fgOverlay30')

/** The svg box, grown from the path bounds to accommodate the stroke that overhangs them. */
const CHEVRON_BOX_WIDTH = CHEVRON_WIDTH + CHEVRON_STROKE
const CHEVRON_BOX_HEIGHT = CHEVRON_HEIGHT + CHEVRON_STROKE

/**
 * A custom hook that returns the last non-zero number of multicursors.
 * This is used to avoid showing the MultiselectMessage changing as the Command Center is closed.
 */
const useNonzeroNumMulticursors = () => {
  const numMulticursors = useSelector(state => Object.keys(state.multicursors).length)
  const lastNumMulticursorsRef = useRef(numMulticursors)

  // update ref if numMulticursors is not zero
  if (numMulticursors !== 0) {
    lastNumMulticursorsRef.current = numMulticursors
  }

  return lastNumMulticursorsRef.current
}

/** Shows a message with the number of thoughts selected, and a cancel button to deselect all. */
const MultiselectMessage: FC = () => {
  const displayNumMulticursors = useNonzeroNumMulticursors()
  return (
    <div>
      <span
        className={css({
          color: 'fg',
          fontWeight: 700,
          letterSpacing: '-0.011em',
          opacity: 0.6,
          fontSize: '1.3em',
        })}
      >
        {displayNumMulticursors} {pluralize('thought', displayNumMulticursors, false)} selected
      </span>
    </div>
  )
}

/**
 * A hidden pre-rendered overlay on mobile, used as a workaround for the
 * Command Center flicker caused by the overlay background only being loaded
 * when the Command Center opens.
 */
const HiddenOverlay = () => {
  return (
    <div
      className={css({
        backgroundImage: 'url(/img/command-center/overlay.webp)',
        visibility: 'hidden',
      })}
    />
  )
}

/**
 * Custom hook that returns reactive transforms for a draggable sheet.
 *
 * The drawer has one fixed height. Only its vertical position changes between the two stages.
 * At the standard stage, the bottom `stageOffset` pixels sit below the screen and are clipped.
 * At the expanded stage, the whole drawer is on screen.
 * The drag handler writes `y` directly from the finger position. Both progress values below are
 * calculated from `y` alone, and so is every animation. That way, the drawer can follow the finger
 * movement.
 */
const useSheetTransforms = (ref: React.RefObject<SheetRef | null>) => {
  /*
   * Force a re-render once the Sheet ref is attached so that the motion transforms below re-run
   * their compute functions while ref.current is set, allowing them to subscribe to the sheet's
   * motion values (e.g. yInverted). On the first render after the Command Center (re)mounts,
   * ref.current is still null, so the compute functions read no motion values and the overlay
   * opacity stays stuck at 0 (transparent). This is most visible when the Command Center remounts
   * after a modal (Export/Share, Devices, Settings) is closed while it is still open.
   */
  const [, setSheetReady] = useState(false)
  useEffect(() => {
    if (ref.current) setSheetReady(true)
  }, [ref])

  const height = useTransform(() => {
    return ref.current?.yInverted.get() ?? 0
  })
  /**
   * Controls the overlay opacity and the blur height.
   *
   * The value is 0 when the drawer is closed and 1 when the drawer is open. Both drawer stages,
   * standard and expanded, count as open, so the overlay height stays the same at either stage.
   */
  const sheetProgress = useTransform(() => {
    const yInverted = ref.current?.yInverted.get() ?? 0
    const standardHeight = ref.current?.snapPoints[SNAP_STANDARD]?.snapValue ?? 0
    if (standardHeight <= 0) return 0
    return Math.min(Math.max(yInverted / standardHeight, 0), 1)
  })

  const blurHeight = useTransform(height, height => {
    // Start at 0, then smoothly grow with progress
    return height + 110 * sheetProgress.get()
  })

  /** 0 at the standard stage, 1 at the expanded stage. Every stage animation derives from this one value. */
  const stageProgress = useTransform(() => {
    const y = ref.current?.y.get() ?? Infinity
    const stageOffset = ref.current?.snapPoints[SNAP_STANDARD]?.snapValueY ?? 0
    if (!stageOffset) return 0
    return Math.min(Math.max(1 - y / stageOffset, 0), 1)
  })

  return { height, opacity: sheetProgress, blurHeight, stageProgress }
}

/**
 * A panel that displays the Command Center.
 */
const CommandCenter = () => {
  const dispatch = useDispatch()
  const showCommandCenter = useSelector(state => state.showCommandCenter)
  const showSidebar = useSelector(state => state.showSidebar)
  const isTutorialOn = useSelector(isTutorial)
  const fontSize = useSelector(state => state.fontSize)
  const sheetRef = useRef<SheetRef>(null)
  const { height, opacity, blurHeight, stageProgress } = useSheetTransforms(sheetRef)

  const stageOffset = Math.round(fontSize * STAGE_OFFSET_REM)

  /* Negative snap points are measured from the top of the sheet, so this resolves to
   * [closed, sheetHeight - stageOffset, sheetHeight]. At the standard stage, the bottom stageOffset
   * pixels of the drawer stay below the screen, since the Sheet root clips those pixels. */
  const snapPoints = useMemo(() => [0, -stageOffset, 1], [stageOffset])

  const [stage, setStage] = useState<'standard' | 'expanded'>('standard')
  const [isCommandTableMounted, setIsCommandTableMounted] = useState(false)

  /*
   * The expanded stage's scroll container. The Sheet's own scroller is never scrollable here (the
   * CommandTable is an absolutely positioned overlay so that it cannot change the measured sheet
   * height), so its scroll position is tracked manually and fed back to Sheet.Content.
   */
  const scrollerRef = useRef<HTMLDivElement>(null)
  const { scrollRef, scrollPosition } = useScrollPosition()
  const setScrollerRef = useCallback(
    (el: HTMLDivElement | null) => {
      scrollerRef.current = el
      scrollRef(el)
    },
    [scrollRef],
  )

  // Disabling drag-to-collapse when the CommandTable's scroll position is not at the top.
  // This ensures that the drag-to-collapse gesture does not conflict with scrolling the list.
  const isDragDisabled = scrollPosition !== undefined && scrollPosition !== 'top'

  /** Where the current touch started, and whether the command list was at its top at that moment. Both are read at touchstart because the browser decides whether to claim the gesture as a scroll on the very first touchmove, by which point the list may already have moved. */
  const touchStartYRef = useRef(0)
  const isListAtTopRef = useRef(false)

  /** Prevent native page scroll when dragging the sheet. The page body is scrollable, and without this the browser scrolls the body on touchmove, stealing touch from the sheet's drag handler. React touch handlers are passive so we need a non-passive listener via addEventListener. */
  const preventTouchMoveRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return

    /** Records where the touch began and whether the command list was at its top, for onTouchMove to classify the gesture from. */
    const onTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0]?.clientY ?? 0
      isListAtTopRef.current = (scrollerRef.current?.scrollTop ?? 0) <= 0
    }

    /** Prevent native page scroll on touchmove, except inside the expanded stage's scroll container, which needs the browser to scroll it. Its overscroll-behavior keeps that scroll from chaining to the body. */
    const onTouchMove = (e: TouchEvent) => {
      // check if the touch is inside the scroll container of the command list
      if (e.target instanceof Node && scrollerRef.current?.contains(e.target)) {
        const isTouchMovingUp = (e.touches[0]?.clientY ?? 0) < touchStartYRef.current

        // if the swipe direction is upward (means to scroll-down the list) or when the scroll position of the command list is not in the top, we should return early to allow normal scrolling behavior
        if (isTouchMovingUp || !isListAtTopRef.current) return
      }
      e.preventDefault()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  const onClose = useCallback(() => {
    dispatch([toggleDropdown({ dropDownType: 'commandCenter', value: false }), clearMulticursors()])
  }, [dispatch])

  /** Records the stage the drawer settled on, and reset the command list's scroll position so the next expand starts at the top. */
  const onSnap = useCallback((snapIndex: number) => {
    setStage(snapIndex === SNAP_EXPANDED ? 'expanded' : 'standard')
    if (snapIndex !== SNAP_EXPANDED) scrollerRef.current?.scrollTo({ top: 0 })
  }, [])

  // mount the CommandTable only when the Command Center is open, to avoid unnecessary renders and state updates when it is closed
  const onOpenEnd = useCallback(() => {
    setIsCommandTableMounted(true)

    /* If the sheet had not been measured when it opened, Sheet falls back to y=0 and the drawer opens
     * fully expanded while reporting the standard stage.
     * As a workaround, we check the sheet's position and snap it to the standard stage if necessary.
     */
    const sheet = sheetRef.current
    if (sheet && sheet.snapPoints.length > 0 && sheet.y.get() < stageOffset / 2) sheet.snapTo(SNAP_STANDARD)
  }, [stageOffset])

  const onCloseEnd = useCallback(() => {
    setIsCommandTableMounted(false)
    setStage('standard')
  }, [])

  useEffect(() => {
    if (isTouch && showCommandCenter && showSidebar) onClose()
  }, [onClose, showCommandCenter, showSidebar])

  const isOpen = showCommandCenter && !showSidebar

  // The Standard and Expanded stage animations are controlled independently by
  // `standardViewOpacity` and `expandedViewOpacity`, but both are derived from
  // the same `stageProgress` value to ensure smooth transitions between stages.
  const standardViewOpacity = useTransform(stageProgress, [0, 0.9], [1, 0])
  const expandedViewOpacity = useTransform(stageProgress, [0.3, 1], [0, 1])
  const standardPointerEvents = useTransform(stageProgress, p => (p > 0.5 ? 'none' : 'auto')) as MotionValue<
    'none' | 'auto'
  >
  const expandedPointerEvents = useTransform(stageProgress, p => (p > 0.5 ? 'auto' : 'none')) as MotionValue<
    'none' | 'auto'
  >

  if (isTouch && !isTutorialOn) {
    return (
      <>
        {isOpen && (
          <motion.div
            /*
             * Progressive blur effect. Must be placed outside the Sheet to avoid separation
             * from the background content due to the fixed position of the parent.
             */
            className={css({
              position: 'fixed',
              pointerEvents: 'none',
              backdropFilter: 'blur(2px)',
              mask: 'linear-gradient(180deg, {colors.bgTransparent} 0%, black 110px, black 100%)',
              bottom: 0,
              width: '100%',
              zIndex: 'commandCenterBlur',
            })}
            style={{
              height: blurHeight,
            }}
          />
        )}
        <HiddenOverlay />
        <Sheet
          data-testid='command-center-panel'
          ref={sheetRef}
          isOpen={isOpen}
          onClose={onClose}
          detent='content'
          unstyled
          snapPoints={snapPoints}
          initialSnap={SNAP_STANDARD}
          onSnap={onSnap}
          onOpenEnd={onOpenEnd}
          onCloseEnd={onCloseEnd}
          disableDismiss={stage === 'expanded'}
          /** The expanded stage's search field would otherwise auto-snap the sheet and disable dragging while the keyboard is open. Em manages the virtual keyboard itself. */
          avoidKeyboard={false}
          tweenConfig={{
            duration: durations.get('commandCenter') / 1000,
            ease: isOpen ? easeOpen : easeClose,
          }}
          style={{
            /** Override default Sheet zIndex. */
            zIndex: token('zIndex.commandCenter'),
          }}
          /** Fixes sheet shifting up on ios when it opens. */
          disableScrollLocking
        >
          <motion.div
            /** Falloff. */
            className={css({
              pointerEvents: 'none',
              position: 'absolute',
              background: 'linear-gradient(180deg, {colors.bgTransparent} 0%, {colors.bg} 1.2rem)',
              paddingTop: '0.711rem',
              bottom: 0,
              width: '100%',
              height: '100%',
            })}
            style={{ height }}
          />
          <motion.div
            data-testid='command-center-overlay'
            className={css({
              position: 'fixed',
              pointerEvents: 'none',
              backgroundImage: 'url(/img/command-center/overlay.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
              height: '100vh',
              width: '100%',
              bottom: 0,
            })}
            style={{ opacity }}
          />
          <Sheet.Container
            ref={preventTouchMoveRef}
            data-testid='command-menu-panel'
            data-stage={stage}
            className={css({
              backgroundColor: 'transparent',
              overflow: 'visible',
              boxShadow: 'none',
            })}
            style={{
              // override default Sheet.Container styles
              maxHeight: '70%',
              zIndex: 'auto',
            }}
          >
            <Sheet.Header
              className={css({
                position: 'relative',
                marginBottom: '0.889rem',
              })}
            >
              <motion.div
                /** The chevron strip, floating above the drawer's top edge over the falloff gradient. Full width so that it is part of the band rather than a button-sized island in it, and inert in the standard stage, where it would otherwise eat taps on the thoughtspace behind it. */
                className={css({
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                })}
                style={{ opacity: expandedViewOpacity, pointerEvents: expandedPointerEvents }}
              >
                <button
                  {...fastClick(() => sheetRef.current?.snapTo(SNAP_STANDARD))}
                  data-testid='command-center-collapse'
                  aria-label='Collapse Command Center'
                  className={css({
                    all: 'unset',
                    display: 'block',
                    cursor: 'pointer',
                    padding: '0.556rem 1.333rem',
                  })}
                >
                  <ChevronImg
                    variant='stroked'
                    direction='down'
                    width={CHEVRON_BOX_WIDTH}
                    height={CHEVRON_BOX_HEIGHT}
                    strokeWidth={CHEVRON_STROKE}
                    fill={CHEVRON_COLOR}
                  />
                </button>
              </motion.div>
              <div
                className={css({
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  /** The inset the row used to inherit from the content root, which it no longer lives in. It sits here rather than on the band so the band stays full-bleed. */
                  margin: '0 1.333rem',
                })}
              >
                <MultiselectMessage />
                <motion.button
                  {...fastClick(onClose)}
                  data-testid='command-center-done'
                  className={css({
                    all: 'unset',
                    fontSize: '0.85em',
                    fontWeight: 500,
                    letterSpacing: '-0.011em',
                    color: 'fg',
                    opacity: 0.5,
                    borderRadius: 46,
                    cursor: 'pointer',
                    padding: '8px 16px',
                    background: 'commandCenterDoneButton',
                  })}
                  style={{ opacity: standardViewOpacity, pointerEvents: standardPointerEvents }}
                >
                  Done
                </motion.button>
              </div>
            </Sheet.Header>
            <Sheet.Content
              className={css({
                overflow: 'visible',
              })}
              disableDrag={isDragDisabled}
              /** The Sheet's own scroller is not used, and its default `pan-down` would intersect with the expanded stage's scroll container and stop it scrolling upward. */
              scrollStyle={{ touchAction: 'auto' }}
            >
              <div
                className={css({
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  margin: '0 1.333rem',
                  gap: '0.889rem',
                })}
                style={{
                  // Apply extra padding to the bottom of the content to account for the safe area and the chevron section.
                  // However, safeAreaBottom is not always available (e.g, in a browser).
                  // So we use `max()` to apply a minimum padding to prevent the chevron from sitting too close
                  // to the bottom of the screen.
                  paddingBottom: `calc(1.333rem + max(${token('spacing.safeAreaBottom')}, 0.889rem) + ${CHEVRON_SECTION_HEIGHT_REM}rem)`,
                }}
              >
                <div className={css({ position: 'relative' })}>
                  <motion.div
                    className={css({
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gridTemplateRows: 'auto',
                      gridAutoFlow: 'row',
                      gap: '0.622rem',
                      gridRowGap: '0.889rem',
                    })}
                    style={{ opacity: standardViewOpacity, pointerEvents: standardPointerEvents }}
                  >
                    <PanelCommand command={{ ...copyCursorCommand, label: 'Copy' }} size='small' />
                    <PanelCommand command={note} size='small' />
                    <PanelCommand command={{ ...favorite, label: 'Favorite' }} size='small' />
                    <PanelCommand command={deleteCommand} size='small' />
                    <PanelCommandGroup commandSize='small' commandCount={2}>
                      <PanelCommand command={{ ...outdent, label: '' }} size='small' />
                      <PanelCommand command={{ ...indent, label: '' }} size='small' />
                    </PanelCommandGroup>
                    <PanelCommand command={swapParent} size='medium' />
                    <PanelCommand command={categorize} size='medium' />
                    <PanelCommand command={uncategorize} size='medium' />
                  </motion.div>
                  <motion.div
                    /** Overlays the command grid, extending down over the chevron band and into the region that the standard stage leaves below the screen. Absolutely positioned so that it cannot change the measured sheet height, which the snap points are computed from. */
                    className={css({
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      display: 'flex',
                      minHeight: 0,
                    })}
                    style={{
                      opacity: expandedViewOpacity,
                      pointerEvents: expandedPointerEvents,
                      // Set a negative bottom value to allow content to extend into the hidden chevron
                      // area instead of stopping at the visible edge.
                      bottom: `calc(-1 * (${CHEVRON_SECTION_HEIGHT_REM}rem + ${STAGE_OFFSET_REM}rem))`,
                    }}
                  >
                    <div
                      ref={setScrollerRef}
                      data-testid='command-center-expanded-content'
                      className={css({
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        /** Keeps an overscroll here from chaining to the page body, which preventTouchMoveRef no longer guards. */
                        overscrollBehavior: 'contain',
                      })}
                    >
                      {isCommandTableMounted && <CommandTable />}
                    </div>
                  </motion.div>
                </div>
                <motion.div
                  /** The chevron band: the full-width strip at the bottom edge of the standard stage, just above the safe area inset. It is full width rather than just the button so that a thumb swipe landing beside the arrow still falls on the band, which is where the expand affordance reads as being. */
                  className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  })}
                  style={{ opacity: standardViewOpacity, pointerEvents: standardPointerEvents }}
                >
                  <button
                    {...fastClick(() => sheetRef.current?.snapTo(SNAP_EXPANDED))}
                    data-testid='command-center-expand'
                    aria-label='Expand Command Center'
                    className={css({
                      all: 'unset',
                      display: 'block',
                      cursor: 'pointer',
                      padding: '0.222rem 1.333rem',
                    })}
                  >
                    <ChevronImg
                      variant='stroked'
                      direction='up'
                      width={CHEVRON_BOX_WIDTH}
                      height={CHEVRON_BOX_HEIGHT}
                      strokeWidth={CHEVRON_STROKE}
                      fill={CHEVRON_COLOR}
                    />
                  </button>
                </motion.div>
              </div>
            </Sheet.Content>
          </Sheet.Container>
        </Sheet>
      </>
    )
  }
}

export default CommandCenter
