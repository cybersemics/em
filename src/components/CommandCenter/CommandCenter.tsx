import _ from 'lodash'
import { MotionValue, PanInfo, motion, useTransform } from 'motion/react'
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

/** Snap index of the standard stage. Index 0 is the closed state, which the Sheet turns into onClose. */
const SNAP_STANDARD = 1
/** Snap index of the expanded stage. */
const SNAP_EXPANDED = 2

/** How much taller the drawer is in its expanded stage than in its standard stage, as a multiple of the font size. ~50px at the default font size. */
const STAGE_OFFSET_REM = 2.778
/** Height of the band at the bottom of the drawer reserved for the expand chevron, as a multiple of the font size. ~28px at the default font size. */
const CHEVRON_BAND_REM = 1.556

/** How far the command grid slides up as it fades out, as a multiple of the font size. */
const GRID_SLIDE_REM = 0.889
/** How far the CommandTable slides up as it fades in, as a multiple of the font size. */
const TABLE_SLIDE_REM = 1.333

/** Dimensions of the chevron path, in px, matching the Command Center design. These are the path's own bounds, as reported by Figma; the centre-aligned stroke adds half its width beyond them on every side, so the svg box is larger by CHEVRON_STROKE in each axis. */
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
 * The drawer has a single, fixed height. What changes between its two stages is how far it is pushed
 * down: at the standard stage the bottom `stageOffset` pixels hang below the screen and are clipped,
 * and at the expanded stage the whole drawer is on screen. Both progress values below are therefore
 * pure functions of the sheet's `y`, which the drag handler writes directly from the finger. Deriving
 * every animation from `y` is what makes the transition track the gesture without anything jumping
 * when it ends.
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

  /*
   * 0 while closed, 1 once the drawer reaches the standard stage, and 1 for the rest of the way to the
   * expanded stage. Normalized against the standard snap point rather than the full sheet height so
   * that expanding does not brighten the glow overlay, which the design requires to stay fixed.
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

  /*
   * The two vertical dimensions the drawer's stages are built from, resolved against the font size
   * (`1rem` is `state.fontSize`, see AppComponent). They are published to CSS as custom properties on
   * the content root below, because `css()` is extracted at build time and cannot read runtime values.
   */
  const stageOffset = Math.round(fontSize * STAGE_OFFSET_REM)
  const chevronBand = Math.round(fontSize * CHEVRON_BAND_REM)

  /* Negative snap points are measured from the top of the sheet, so this resolves to
   * [closed, sheetHeight - stageOffset, sheetHeight] — i.e. the standard stage leaves the bottom
   * stageOffset pixels of the drawer below the screen, where the Sheet root clips them. */
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

  /** Only let a downward drag collapse the drawer when the command list is scrolled to the top, so the gesture does not conflict with scrolling the list. */
  const isDragDisabled = scrollPosition !== undefined && scrollPosition !== 'top'

  /*
   * How far the collapse band's lower edge sits below the drawer's top edge, i.e. the height of the
   * header row. Measured rather than derived from fontSize so the band lands on the row's bottom edge
   * whatever the row grows to. Both the row and the drawer's top move together under the drag
   * transform, so the difference is stable mid-gesture.
   *
   * This is a callback ref rather than an effect because the Sheet mounts its content after the open
   * flag flips: an effect keyed on that flag runs while the row does not exist yet, bails, and never
   * runs again, leaving the band the width of the chevron alone.
   */
  const [collapseBandInset, setCollapseBandInset] = useState(0)
  const headerRowObserverRef = useRef<ResizeObserver | null>(null)
  const setHeaderRowRef = useCallback((el: HTMLDivElement | null) => {
    headerRowObserverRef.current?.disconnect()
    headerRowObserverRef.current = null
    if (!el) return
    /** Re-measures the header row's bottom relative to the sheet container's top, ignoring the zero it reads before the row has been laid out. */
    const measure = () => {
      const container = el.closest('.react-modal-sheet-container')
      if (!container) return
      const inset = el.getBoundingClientRect().bottom - container.getBoundingClientRect().top
      if (inset > 0) setCollapseBandInset(inset)
    }
    measure()
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(el)
    headerRowObserverRef.current = resizeObserver
  }, [])

  /** The full-width strip at the bottom of the standard stage that the expand chevron sits in. */
  const chevronBandRef = useRef<HTMLDivElement>(null)
  /** True while a drag is in progress that began outside the chevron band at the standard stage, and so may not cross into the expanded stage. */
  const isExpandBlockedRef = useRef(false)
  /** True while a drag is in progress that began at the expanded stage. Such a drag collapses to the standard stage however far or fast it is thrown, so that leaving the Command Center always takes a second, deliberate swipe from the standard stage. */
  const [isDismissBlocked, setIsDismissBlocked] = useState(false)

  /** The y the sheet rests at in the standard stage, i.e. the whole travel between the two stages. */
  const getStandardY = useCallback(() => sheetRef.current?.snapPoints[SNAP_STANDARD]?.snapValueY ?? 0, [])

  /** Classifies the gesture by where it starts, since both restrictions below depend on the stage the drag began at and the region it began in, rather than on where it ends up. */
  const onDragStart = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent) => {
      const startedExpanded = (sheetRef.current?.y.get() ?? Infinity) < getStandardY() / 2
      setIsDismissBlocked(startedExpanded)
      const target = event.target
      isExpandBlockedRef.current =
        !startedExpanded && !(target instanceof Node && !!chevronBandRef.current?.contains(target))
    },
    [getStandardY],
  )

  /**
   * Holds the drawer at the standard stage for the rest of a drag that did not begin in the chevron band,
   * so that only a swipe starting near the arrow can cross into the expanded stage. Downward drags are
   * untouched, so dragging the drawer body down still closes it. The Sheet calls this before writing
   * `y + delta` itself, so the ceiling is applied by pre-adjusting `y` such that the Sheet's own write
   * lands exactly on the standard snap.
   */
  const onDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!isExpandBlockedRef.current) return
      const y = sheetRef.current?.y
      const standardY = getStandardY()
      if (y && y.get() + info.delta.y < standardY) y.set(standardY - info.delta.y)
    },
    [getStandardY],
  )

  /** Prevent native page scroll when dragging the sheet. The page body is scrollable, and without this the browser scrolls the body on touchmove, stealing touch from the sheet's drag handler. React touch handlers are passive so we need a non-passive listener via addEventListener. */
  const preventTouchMoveRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    /** Prevent native page scroll on touchmove, except inside the expanded stage's scroll container, which needs the browser to scroll it. Its overscroll-behavior keeps that scroll from chaining to the body. */
    const handler: EventListenerOrEventListenerObject = e => {
      if (e.target instanceof Node && scrollerRef.current?.contains(e.target)) return
      e.preventDefault()
    }
    el.addEventListener('touchmove', handler, { passive: false })
    return () => el.removeEventListener('touchmove', handler)
  }, [])

  const onClose = useCallback(() => {
    dispatch([toggleDropdown({ dropDownType: 'commandCenter', value: false }), clearMulticursors()])
  }, [dispatch])

  /** Records the stage the drawer settled on, and rewinds the command list so the next expand starts at the top. */
  const onSnap = useCallback((snapIndex: number) => {
    setStage(snapIndex === SNAP_EXPANDED ? 'expanded' : 'standard')
    if (snapIndex !== SNAP_EXPANDED) scrollerRef.current?.scrollTo({ top: 0 })
  }, [])

  /** Mounts the CommandTable once the open animation is over, keeping useCommandList off the critical path. It has to be mounted before a drag can reveal it, so this cannot wait for onSnap. */
  const onOpenEnd = useCallback(() => {
    setIsCommandTableMounted(true)
    /* If the sheet had not been measured when it opened, Sheet falls back to y=0 and the drawer opens
     * fully expanded while reporting the standard stage. Correct it here. */
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

  /* Every stage animation below is a different mapping of the same stageProgress, so they cannot
   * drift apart: there is one number driving all of them, and that number is the finger. */
  const doneOpacity = useTransform(stageProgress, [0, 0.5], [1, 0])
  const gridOpacity = useTransform(stageProgress, [0, 0.6], [1, 0])
  const gridY = useTransform(stageProgress, [0, 1], [0, -fontSize * GRID_SLIDE_REM])
  const tableOpacity = useTransform(stageProgress, [0.3, 1], [0, 1])
  const tableY = useTransform(stageProgress, [0, 1], [fontSize * TABLE_SLIDE_REM, 0])
  const expandOpacity = useTransform(stageProgress, [0, 0.4], [1, 0])
  const collapseOpacity = useTransform(stageProgress, [0.6, 1], [0, 1])
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
          onDragStart={onDragStart}
          onDrag={onDrag}
          /** A drag that begins at the expanded stage may only collapse to the standard stage; closing the Command Center always takes a second swipe from there. */
          disableDismiss={isDismissBlocked}
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
            {/*
             * Sheet.Header is the only slot outside Sheet.Content that react-modal-sheet gives its drag
             * props to, so wrapping the chevron in one makes a swipe on it drive the sheet exactly as a
             * swipe on the drawer body does. Kept out of flow so that it cannot change the measured sheet
             * height that the snap points are computed from. It is deliberately not gated on
             * isDragDisabled: the band covers the chevron and the header row, neither of which is part of
             * the command list, so it stays a handle no matter where that list is scrolled.
             */}
            <Sheet.Header
              /**
               * The collapse band: the full-width strip spanning the collapse chevron and the header row
               * beneath it, so that a swipe landing beside the arrow still collapses the drawer. Its upper
               * part floats above the drawer over the falloff gradient; the padding is what carries its
               * lower edge down past the header row, which keeps the arrow itself at the band's top edge —
               * exactly where it sat when the band was only as wide as the button.
               */
              className={css({
                position: 'absolute',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                /** Sheet.Header is rendered before Sheet.Content, so without this the header row paints over the band and a drag there reaches Sheet.Content instead — which is gated on isDragDisabled, the very gate the band exists to bypass. Safe because the band is pointer-events: none in the standard stage, and Done is pointer-events: none in the expanded one. */
                zIndex: 1,
              })}
              style={{
                bottom: `calc(100% - ${collapseBandInset}px)`,
                paddingBottom: collapseBandInset,
                opacity: collapseOpacity,
                pointerEvents: expandedPointerEvents,
              }}
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
                  /** The stage offset is what makes the drawer taller than the standard stage needs; at the standard stage it hangs below the screen and is clipped. */
                  paddingBottom:
                    'calc(1.333rem + {spacing.safeAreaBottom} + var(--command-center-chevron-band) + var(--command-center-stage-offset))',
                  gap: '0.889rem',
                })}
                style={
                  {
                    '--command-center-stage-offset': `${stageOffset}px`,
                    '--command-center-chevron-band': `${chevronBand}px`,
                  } as React.CSSProperties
                }
              >
                <div
                  ref={setHeaderRowRef}
                  className={css({
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
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
                    style={{ opacity: doneOpacity, pointerEvents: standardPointerEvents }}
                  >
                    Done
                  </motion.button>
                </div>
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
                    style={{ opacity: gridOpacity, y: gridY, pointerEvents: standardPointerEvents }}
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
                      bottom: 'calc(-1 * (var(--command-center-chevron-band) + var(--command-center-stage-offset)))',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                    })}
                    style={{ opacity: tableOpacity, y: tableY, pointerEvents: expandedPointerEvents }}
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
                  ref={chevronBandRef}
                  /** The chevron band: the full-width strip at the bottom edge of the standard stage, just above the safe area inset. It is full width rather than just the button because it doubles as the only region a drag may start in and still expand the drawer, and a thumb swipe that lands beside the arrow should still count. */
                  className={css({
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 'calc(var(--command-center-stage-offset) + {spacing.safeAreaBottom})',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  })}
                  style={{ opacity: expandOpacity, pointerEvents: standardPointerEvents }}
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
