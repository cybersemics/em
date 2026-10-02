import _ from 'lodash'
import {
  MotionValue,
  PanInfo,
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react'
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
import backgroundGlowStore from '../../stores/backgroundGlowStore'
import durations from '../../util/durations'
import fastClick from '../../util/fastClick'
import CommandTable from '../CommandTable'
import ChevronIcon from '../icons/ChevronIcon'
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
 * Expand bounce constants
 **************************************************************/

/** Peak lift a bounce may reach. The expanded stage's command list already extends CHEVRON_SECTION_HEIGHT_REM + STAGE_OFFSET_REM below the viewport, so staying under that budget lifts the drawer without opening a gap beneath it. */
const BOUNCE_MAX_REM = 2

/** The bounce spring. Physics keys rather than visualDuration/bounce: motion discards the inherited velocity for time-defined springs, which would make a velocity-seeded bounce a silent no-op. A damping ratio of ~0.7 gives one soft overshoot and no ringing. */
const BOUNCE_SPRING = { type: 'spring', stiffness: 400, damping: 28, mass: 1 } as const

/** Peak lift in px per px/s of seed velocity under BOUNCE_SPRING, from its analytic solution. Converts the lift budget into a velocity ceiling. */
const BOUNCE_PEAK_PER_VELOCITY = 0.023

/** Below this release speed the gesture is a deliberate placement rather than a fling, and does not bounce. */
const BOUNCE_MIN_VELOCITY = 300

/** How close to the expanded stage a release must be, in px, for the bounce to take over the arrival. Releasing further down leaves travel for the Sheet's own tween, and a bounce layered on top of that reads as a second movement. */
const BOUNCE_AT_TOP_EPSILON = 1

/**
 * Expand curve for the chevron. Rises to ~1.62 of the travel before settling at 1, so the drawer sails
 * past the expanded stage and comes back down in one continuous motion.
 *
 * It has to be the easing of the travel itself rather than a separate animation that follows it: an
 * ease-out tween stops dead at its target, so a bounce bolted onto the end reads as a second movement.
 * Overshoot is a fraction of the travel, which for the chevron is always one stage offset — 1.72rem,
 * inside the lift budget, and proportional to the font size like everything else here.
 */
const easeExpandOvershoot = [0.3, 2.2, 0.6, 1.75] as const

/** Asymptotic resistance. Maps an unbounded drag past the expanded stage onto [0, max), so that the drawer keeps answering the finger without ever reaching the gap budget. */
const rubberBand = (raw: number, max: number) => max * (1 - 1 / (raw / max + 1))

/**
 * Splits one drag frame into the part taken up as lift and the part that still moves the drawer.
 *
 * `raw` is the cumulative unresisted distance dragged past the expanded stage, and `deltaY` is this
 * frame's finger movement, negative upward.
 */
const applyOvershootDrag = ({ deltaY, raw, y }: { deltaY: number; raw: number; y: number }) => {
  if (deltaY < 0) {
    const next = y + deltaY
    // above the expanded stage the drawer absorbs y down to 0 and the lift takes the remainder
    return next >= 0 ? { deltaY, raw } : { deltaY: -y, raw: raw - next }
  }
  // moving back down unwinds the lift before it moves the drawer again
  const consumed = Math.min(deltaY, raw)
  return { deltaY: deltaY - consumed, raw: raw - consumed }
}

/**************************************************************
 * Chevron section constants
 **************************************************************/

/** The height of Chevron section area. */
const CHEVRON_SECTION_HEIGHT_REM = 1.56

/** Dimensions of the chevron svg in px. The rounded path is inset by half its stroke, so these are the bounds of the visible mark, not a box it is letterboxed inside. */
const CHEVRON_WIDTH = 33
const CHEVRON_HEIGHT = 13

/** Colour of the chevron. */
const CHEVRON_COLOR = token('colors.fgOverlay10')

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
const useSheetTransforms = (ref: React.RefObject<SheetRef | null>, bounceY: MotionValue<number>) => {
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

  // Subtracting the bounce lift (which is negative) keeps the falloff gradient and the blur glued to the
  // drawer's top edge while it overshoots the expanded stage.
  const height = useTransform(() => {
    return (ref.current?.yInverted.get() ?? 0) - bounceY.get()
  })
  /**
   * Controls the blur height, and the overlay opacity outside a collapse.
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

  /**
   * Tracks whether a downward drag started from the expanded stage. The same position can mean
   * either dismissal or a return to the standard stage, so this determines whether the overlay
   * stays visible or fades.
   */
  const isSnappingFromExpandedRef = useRef(false)

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

  /** Fades the overlay only while opening or closing. Keep it opaque when collapsing from expanded. */
  const overlayOpacity = useTransform(() => {
    const progress = sheetProgress.get()
    return isSnappingFromExpandedRef.current ? 1 : progress
  })

  /** Remember whether a drag started closer to the expanded stage than the standard stage. */
  const onDragStart = useCallback(() => {
    const sheet = ref.current
    const standardY = sheet?.snapPoints[SNAP_STANDARD]?.snapValueY ?? 0
    isSnappingFromExpandedRef.current = standardY > 0 && (sheet?.y.get() ?? Infinity) < standardY / 2
  }, [ref])

  /** Clear the expanded-origin snap state so a dismissal fades the overlay as designed. */
  const clearExpandedSnap = useCallback(() => {
    isSnappingFromExpandedRef.current = false
  }, [])

  return { height, opacity: overlayOpacity, blurHeight, stageProgress, onDragStart, clearExpandedSnap }
}

/**
 * The upward counterpart to the drawer's existing drag-past-the-snap bounce.
 *
 * The Sheet clamps its own `y` at the expanded stage, so the drawer cannot overshoot upward and has
 * nothing to animate back from. `bounceY` is an extra translate that the Sheet never touches. The drag
 * handler feeds it the part of the swipe the Sheet refuses, under rubber-band resistance, so the drawer
 * stays with the finger above the expanded stage; the release springs it back, seeded with the gesture's
 * own velocity so that a fling carries past 0 even when the finger never overshot.
 */
const useExpandBounce = ({
  bounceY,
  fontSize,
  scrollerRef,
  sheetRef,
}: {
  bounceY: MotionValue<number>
  fontSize: number
  scrollerRef: React.RefObject<HTMLDivElement | null>
  sheetRef: React.RefObject<SheetRef | null>
}) => {
  const prefersReducedMotion = useReducedMotion()

  /** Seed velocity for the bounce, held between the release and the snap that decides whether it fires. */
  const seedRef = useRef(0)

  /** Cumulative unresisted distance dragged past the expanded stage. The visible lift is this run through rubberBand. */
  const rawRef = useRef(0)

  /** Whether the current gesture started inside the expanded stage's command list. An upward swipe there scrolls the list, but the Sheet reports drag events for it all the same, so the drawer must not lift. */
  const isListScrollRef = useRef(false)

  const maxLift = Math.round(fontSize * BOUNCE_MAX_REM)

  /** Springs the lift back to 0, seeded with an upward (negative) velocity so that it travels past 0 before settling. */
  const bounce = useCallback(
    (seed: number) => {
      // durations are zero in e2e, where an animated bounce would only add flakiness
      if (!durations.get('commandCenter') || prefersReducedMotion) {
        bounceY.set(0)
        return
      }
      // The budget left for the spring shrinks by whatever lift is already applied, so that a drag-time
      // lift and the spring cannot stack past maxLift.
      const ceiling = Math.max(maxLift - Math.abs(bounceY.get()), 0) / BOUNCE_PEAK_PER_VELOCITY
      animate(bounceY, 0, { ...BOUNCE_SPRING, velocity: -Math.min(Math.abs(seed), ceiling) })
    },
    [bounceY, maxLift, prefersReducedMotion],
  )

  /** Classifies the gesture, so that scrolling the command list cannot be mistaken for dragging the drawer. */
  const onDragStart = useCallback(
    (e: MouseEvent | TouchEvent | PointerEvent) => {
      isListScrollRef.current = e.target instanceof Node && !!scrollerRef.current?.contains(e.target)
      // the drag writes the lift directly, so a spring still settling from the last release must let go of it
      bounceY.stop()
    },
    [bounceY, scrollerRef],
  )

  /**
   * Lets the drawer follow the finger above the expanded stage.
   *
   * The Sheet clamps its own `y` at 0, so the part of the drag past that point is taken up as lift
   * instead. The Sheet applies `y.set(y.get() + info.delta.y)` immediately after this handler returns,
   * which is what the pre-compensation below accounts for: writing `y` here decides where that addition
   * lands.
   */
  const onDrag = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const sheetY = sheetRef.current?.y
      if (!sheetY || isListScrollRef.current) return
      const y = sheetY.get()
      const next = applyOvershootDrag({ deltaY: info.delta.y, raw: rawRef.current, y })
      if (next.deltaY !== info.delta.y) sheetY.set(y + next.deltaY - info.delta.y)
      rawRef.current = next.raw
      bounceY.set(-rubberBand(next.raw, maxLift))
    },
    [bounceY, maxLift, sheetRef],
  )

  /** Holds the release velocity until the snap reports which stage the gesture landed on. */
  const onDragEnd = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    seedRef.current = isListScrollRef.current ? 0 : info.velocity.y
  }, [])

  /**
   * Settles the lift on release, carrying it past 0 when the gesture both expanded the drawer and was
   * fast enough to read as a fling. A slow release still has to unwind whatever lift the finger left.
   * The Sheet calls onSnap once the destination stage is decided and before it animates there, which is
   * both the earliest point at which the destination is known and late enough to need no scheduling.
   */
  const onSnap = useCallback(
    (snapIndex: number) => {
      const seed = seedRef.current
      seedRef.current = 0
      rawRef.current = 0
      const isAtTop = (sheetRef.current?.y.get() ?? Infinity) <= BOUNCE_AT_TOP_EPSILON
      const isFling = snapIndex === SNAP_EXPANDED && isAtTop && seed < -BOUNCE_MIN_VELOCITY
      if (isFling || bounceY.get() !== 0) bounce(isFling ? seed : 0)
    },
    [bounce, bounceY, sheetRef],
  )

  /** Clears the lift so that a reopen starts flat. */
  const reset = useCallback(() => {
    bounceY.set(0)
    rawRef.current = 0
    seedRef.current = 0
  }, [bounceY])

  return { onDrag, onDragEnd, onDragStart, onSnap, reset }
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
  /** Lift above the expanded stage, driven by the bounce. Owned here because the falloff gradient derives from it as well. */
  const bounceY = useMotionValue(0)
  const { height, opacity, blurHeight, stageProgress, onDragStart, clearExpandedSnap } = useSheetTransforms(
    sheetRef,
    bounceY,
  )

  const backgroundGlow = backgroundGlowStore.useState()

  // Reveals the glow-mode falloff only within the sheet area, with the same soft 2.5rem top edge as the plain falloff gradient. Anchored to the bottom of the viewport since the sheet is bottom-anchored.
  const backgroundGlowMask = useMotionTemplate`linear-gradient(to top, black calc(${height}px - 2.5rem), transparent ${height}px)`

  const stageOffset = Math.round(fontSize * STAGE_OFFSET_REM)

  /* Negative snap points are measured from the top of the sheet, so this resolves to
   * [closed, sheetHeight - stageOffset, sheetHeight]. At the standard stage, the bottom stageOffset
   * pixels of the drawer stay below the screen, since the Sheet root clips those pixels. */
  const snapPoints = useMemo(() => [0, -stageOffset, 1], [stageOffset])

  const [stage, setStage] = useState<'standard' | 'expanded'>('standard')
  /**
   * Whether the expand chevron is driving the current snap, which gives the travel an overshooting curve
   * instead of the usual ease-out. The Sheet reads tweenConfig at the moment snapTo is called, so the flag
   * has to land a render before the snap — hence the effect below rather than one tap handler.
   */
  const [isTapExpanding, setIsTapExpanding] = useState(false)

  useEffect(() => {
    if (isTapExpanding) sheetRef.current?.snapTo(SNAP_EXPANDED)
  }, [isTapExpanding])

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

  const {
    onDrag: onBounceDrag,
    onDragEnd: onBounceDragEnd,
    onDragStart: onBounceDragStart,
    onSnap: onBounceSnap,
    reset: resetBounce,
  } = useExpandBounce({ bounceY, fontSize, scrollerRef, sheetRef })

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
  const onSnap = useCallback(
    (snapIndex: number) => {
      setStage(snapIndex === SNAP_EXPANDED ? 'expanded' : 'standard')
      if (snapIndex !== SNAP_EXPANDED) scrollerRef.current?.scrollTo({ top: 0 })
      setIsTapExpanding(false)
      onBounceSnap(snapIndex)
    },
    [onBounceSnap],
  )

  /** The overlay hold and the bounce's gesture classifier both key off where the drag began. */
  const onSheetDragStart = useCallback(
    (e: MouseEvent | TouchEvent | PointerEvent) => {
      onDragStart()
      onBounceDragStart(e)
    },
    [onBounceDragStart, onDragStart],
  )

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
    setIsTapExpanding(false)
    resetBounce()
  }, [resetBounce])

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
          onDragStart={onSheetDragStart}
          onDrag={onBounceDrag}
          onDragEnd={onBounceDragEnd}
          /** Must be onCloseStart rather than onClose: the Done button and the swipe-down gesture dismiss the drawer by clearing the multicursors in Redux and never call onClose, so releasing the hold there would leave the overlay at full opacity for the whole dismiss animation. */
          onCloseStart={clearExpandedSnap}
          disableDismiss={stage === 'expanded'}
          /** The expanded stage's search field would otherwise auto-snap the sheet and disable dragging while the keyboard is open. Em manages the virtual keyboard itself. */
          avoidKeyboard={false}
          tweenConfig={{
            duration: durations.get('commandCenter') / 1000,
            ease: isTapExpanding ? easeExpandOvershoot : isOpen ? easeOpen : easeClose,
          }}
          style={{
            /** Override default Sheet zIndex. */
            zIndex: token('zIndex.commandCenter'),
          }}
          /** Fixes sheet shifting up on ios when it opens. */
          disableScrollLocking
        >
          {backgroundGlow.image ? (
            <motion.div
              /** Falloff when a BackgroundGlow image is active. An exact copy of the app background (glow image at its opacity over the opaque background color), masked to the sheet area with a soft top edge. Because the layer is identical to the background behind the content, the masked blend is a pure crossfade: the thoughts fade out over the mask ramp while the glow brightness stays constant, with no dark seam. The fixed position and identical background sizing keep the image pixel-aligned with the BackgroundGlow layer behind the content. */
              className={css({
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                backgroundColor: 'bg',
              })}
              style={{
                maskImage: backgroundGlowMask,
                WebkitMaskImage: backgroundGlowMask,
              }}
            >
              <div
                className={css({
                  position: 'absolute',
                  inset: 0,
                  backgroundSize: 'cover',
                  backgroundPosition: 'bottom center',
                  backgroundRepeat: 'no-repeat',
                })}
                style={{
                  backgroundImage: `url(/img/glow/${backgroundGlow.image})`,
                  opacity: backgroundGlow.opacity,
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              /** Falloff. Softly cuts off the content behind the sheet by fading to the opaque background color. */
              className={css({
                pointerEvents: 'none',
                position: 'absolute',
                background: 'linear-gradient(180deg, {colors.bgTransparent} 0%, {colors.bg} 2.5rem)',
                paddingTop: '0.711rem',
                bottom: 0,
                width: '100%',
                height: '100%',
              })}
              style={{ height }}
            />
          )}
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
            <motion.div
              /** Carries the expand bounce. Sheet.Container cannot: the Sheet overwrites its transform. Repeats the container's flex column so the layout is unchanged, and keeps its own compositor layer, since this subtree has blanked for a frame on Android WebView when animated beside a backdrop-filter. */
              className={css({
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                width: '100%',
              })}
              style={{ y: bounceY, willChange: 'transform' }}
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
                    <ChevronIcon
                      direction='down'
                      width={CHEVRON_WIDTH}
                      height={CHEVRON_HEIGHT}
                      fill={CHEVRON_COLOR}
                      rounded
                      stretch
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
                      {...fastClick(() => setIsTapExpanding(true))}
                      data-testid='command-center-expand'
                      aria-label='Expand Command Center'
                      className={css({
                        all: 'unset',
                        display: 'block',
                        cursor: 'pointer',
                        padding: '0.222rem 1.333rem',
                      })}
                    >
                      <ChevronIcon
                        direction='up'
                        width={CHEVRON_WIDTH}
                        height={CHEVRON_HEIGHT}
                        fill={CHEVRON_COLOR}
                        rounded
                        stretch
                      />
                    </button>
                  </motion.div>
                </div>
              </Sheet.Content>
            </motion.div>
          </Sheet.Container>
        </Sheet>
      </>
    )
  }
}

export default CommandCenter
