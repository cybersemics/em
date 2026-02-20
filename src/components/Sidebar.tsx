import * as Dialog from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { AnimatePresence, MotionValue, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import _ from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { toggleSidebarActionCreator } from '../actions/toggleSidebar'
import { isSafari } from '../browser'
import { LongPressState } from '../constants'
import viewportStore from '../stores/viewport'
import durations from '../util/durations'
import fastClick from '../util/fastClick'
import FadeTransition from './FadeTransition'
import Favorites from './Favorites'
import { ProgressiveBlur } from './ProgressiveBlur'
import RecentlyDeleted from './RecentlyDeleted'
import RecentlyEdited from './RecentlyEdited'
import FavoritesIcon from './icons/FavoritesIcon'
import PencilIcon from './icons/PencilIcon'
import DeleteIcon from './icons/DeleteIcon'
import ChevronImg from './ChevronImg'

/** Cubic-bezier ease-out curve used for sidebar animations. */
const EASE_OUT = [0.16, 0.6, 0.2, 1] as const

/** Gentler ease-out used when closing the sidebar. */
const EASE_OUT_GENTLE = [0.25, 0.1, 0.25, 1] as const

/** Valid sidebar section IDs. */
type SidebarSectionId = 'favorites' | 'recentlyEdited' | 'recentlyDeleted'

/** Configuration for a sidebar section. */
type SidebarSection = {
  id: SidebarSectionId
  label: string
  icon: React.ComponentType
  hue: number
  saturate: number
}

/** All available sidebar sections. */
const SECTIONS: SidebarSection[] = [
  { id: 'favorites', label: 'Favorites', icon: FavoritesIcon, hue: 0, saturate: 1 },
  { id: 'recentlyEdited', label: 'Recently Edited', icon: PencilIcon, hue: -45, saturate: 1.05 },
  { id: 'recentlyDeleted', label: 'Recently Deleted', icon: DeleteIcon, hue: 128, saturate: 1.1 },
]

/** The header for the sidebar, which by default shows the icon and label
 * for the current SidebarSection. It can be tapped to toggle a dropdown
 * view, which shows all SidebarSections.
 */
const SidebarHeader = ({ sections, sectionId, onSectionChange, isOpen, setIsOpen, onDropdownHeight } : { sections: SidebarSection[], sectionId: SidebarSectionId, onSectionChange: (id: SidebarSectionId) => void, isOpen: boolean, setIsOpen: (open: boolean) => void, onDropdownHeight: (height: number) => void }) =>  {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const section = sections.find((s) => s.id === sectionId)
  const otherSections = sections.filter((s) => s.id !== sectionId)

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      onDropdownHeight(dropdownRef.current.scrollHeight)
    }
  }, [isOpen, sectionId])

  return (
    <div className={css({ position: 'relative', zIndex: 1 })}>
      <div
        {...fastClick(() => setIsOpen(!isOpen))}
        className={css({
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: 'pointer'
        })}
      >
        <div className={css({ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
          <section.icon size={28} fill='rgba(255, 255, 255, 0.75)' />
        </div>
        <SidebarSectionLabel>{section.label}</SidebarSectionLabel>
        <ChevronImg
          onClickHandle={() => setIsOpen(!isOpen)}
          additonalStyle={{
            transition: 'transform 0.2s ease-out',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            opacity: 0.4
          }}
        />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: durations.get('medium') / 1000, ease: EASE_OUT }}
              {...fastClick(() => setIsOpen(false))}
              className={css({
                position: 'absolute',
                // Set position cover the entire screen,
                // adding extra padding to cover uneven edges
                // created by the backdrop filter's blur
                top: 'calc(100% - 16px)',
                left: '-16px',
                right: '-16px',
                height: '100vh',
                backdropFilter: 'blur(8px)',
                background: 'rgba(0, 0, 0, 0.001)',
                cursor: 'pointer',
                maskImage: 'linear-gradient(to bottom, transparent, black 16px)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 16px)',
              })}
            />
            <motion.div
              ref={dropdownRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: durations.get('medium') / 1000, ease: EASE_OUT }}
              style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: '0rem', gap: '0.4rem' }}
            >
              {otherSections.map((s) => (
                <div
                  key={s.id}
                  {...fastClick(() => {
                    onSectionChange(s.id)
                    setIsOpen(false)
                  })}
                  className={css({
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                    opacity: 0.6,
                    '@media (hover: hover)': { _hover: { opacity: 1 } },
                    transition: 'opacity 0.15s ease-out',
                  })}
                >
                  <div className={css({ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
                    <s.icon size={32} fill='rgba(255, 255, 255, 0.75)' />
                  </div>
                  <SidebarSectionLabel active={false}>{s.label}</SidebarSectionLabel>
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
} 

/** A label for a sidebar section. */
const SidebarSectionLabel = ({ children, active }: { children: React.ReactNode, active: boolean }) => {
  return (
    <div className={css({
      backgroundClip: active ? 'text' : undefined,
      WebkitTextFillColor: active ? 'transparent' : undefined,
      color: 'rgba(255, 255, 255, 0.75)',
      fontSize: '1.4rem',
      lineHeight: '1.4rem',
      letterSpacing: '-0.25px',
      marginTop: 4,
      fontWeight: 300
      
    })}>{children}</div>
  )
}

/** Glow overlay behind the sidebar header. Uses a background image (lighten blend)
 * whose width scales with the sidebar and whose height is fixed in px so it
 * stays anchored to the header regardless of viewport dimensions.
 *
 * Animated properties:
 * - backgroundSize width: zooms from 200% → 300% when the dropdown expands
 * - backgroundSize height: grows from 400px → 500px to cover the expanded dropdown
 * - brightness: increases on expand to intensify the glow
 * - hue-rotate / saturate: driven by the parent's shared motion values to
 *   tint the glow when switching sidebar sections
 * - opacity: fades in/out with the sidebar open/close via the parent's contentOpacity
 */
const SidebarOverlay1 = ({ width, opacity, expanded, expandedHeight, hue, sat }: { width: string, opacity: MotionValue<number>, expanded: boolean, expandedHeight: number, hue: MotionValue<number>, sat: MotionValue<number> }) => {
  const brightness = useMotionValue(1)

  useEffect(() => {
    animate(brightness, expanded ? 1.5 : 1.2, { duration: durations.get('medium') / 1000, ease: EASE_OUT })
  }, [expanded])

  const filter = useTransform([brightness, hue, sat], ([b, h, s]) => `blur(4px) brightness(${b}) hue-rotate(${h}deg) saturate(${s})`)

  // Style variants for the collapsed and expanded states.
  const safeY = (px: number) => `calc(${px}px + env(safe-area-inset-top, 0px))`
  const collapsed = { backgroundSize: '200% 400px', backgroundPositionY: safeY(-104) }
  const open = { backgroundSize: '250% 600px', backgroundPositionY: safeY(-168) }

  return (
    <motion.div
      data-test-id={'sidebar-overlay-1'}
      style={{ opacity, filter }}
      initial={collapsed}
      animate={expanded ? open : collapsed}
      transition={{ duration: durations.get('medium') / 1000, ease: EASE_OUT }}
      className={css({
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height: '100vh',
        backgroundImage: 'url(/img/sidebar/overlay-layer-1.webp)',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        mixBlendMode: 'lighten',
        pointerEvents: 'none',
        zIndex: 'sidebar',
      })}
    />
  )
}

/** Overlay layer that adds middle tones to the sidebar colour blend. */
const SidebarOverlay2 = ({ width, opacity, hue, sat }: { width: string, opacity: MotionValue<number>, hue: MotionValue<number>, sat: MotionValue<number> }) => {
  const filter = useTransform([hue, sat], ([h, s]) => `blur(8px) hue-rotate(${h}deg) saturate(${s})`)

  return (
    <motion.div
      style={{ opacity, filter }}
      className={css({
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width,
        backgroundImage: 'url(/img/sidebar/overlay-layer-2.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
        mixBlendMode: 'screen',
        pointerEvents: 'none',
        zIndex: 'sidebar',
      })}
    />
  )
}

/** The sidebar gradient overlay. */
const SidebarGradient = ({
  opacity,
  width,
  showSidebar,
  toggleSidebar,
}: {
  opacity: MotionValue<number>
  width: string
  showSidebar: boolean
  toggleSidebar: (value: boolean) => void
}) => (
  <motion.div
    aria-label='sidebar-gradient'
    aria-hidden='true'
    style={{ opacity }}
    onClick={() => toggleSidebar(false)}
    className={css({
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to right, rgba(10, 10, 18, 1) 0%, {colors.bgTransparent} 100%)',
      width,
      pointerEvents: showSidebar ? 'auto' : 'none',
      cursor: 'pointer',
      userSelect: 'none',
    })}
  />
)

/** The sidebar background component with progressive blur and gradient. */
const SidebarBackground = ({
  x,
  widthPx,
  showSidebar,
  toggleSidebar,
  width,
}: {
  x: MotionValue<number>
  widthPx: number
  showSidebar: boolean
  toggleSidebar: (value: boolean) => void
  width: string
}) => {
  // Derive opacity from sidebar x position, then apply cubic ease-in
  // so the background fades in gently and catches up as the sidebar settles.
  const linearOpacity = useTransform(x, [-widthPx, 0], [0, 1])
  const opacity = useTransform(linearOpacity, v => v * v * v)

  return (
    <div
      className={css({
        position: 'fixed',
        inset: 0,
        zIndex: 'sidebar',
        pointerEvents: 'none',
      })}
    >
      {/* Full-screen overlay – dims the background and closes the sidebar on click */}
      <motion.div
        aria-hidden='true'
        style={{ opacity }}
        onClick={() => toggleSidebar(false)}
        className={css({
          position: 'absolute',
          inset: 0,
          backgroundColor: 'sidebarOverlayBg',
          pointerEvents: showSidebar ? 'auto' : 'none',
          cursor: 'pointer',
          userSelect: 'none',
        })}
      />

      {/*
       * On WebKit (Safari/iOS), it looks better if the blur is applied -above- the gradient. The other way around, there's patchy artifacts.
       * On Chromium, it looks better if the blur is applied -below- the gradient. The other way around, there's visible banding artifacts.
       */}
      {isSafari() ? (
        <>
          <SidebarGradient opacity={opacity} width={width} showSidebar={showSidebar} toggleSidebar={toggleSidebar} />
          <ProgressiveBlur direction='to right' minBlur={0} maxBlur={32} layers={4} width={width} opacity={opacity} />
        </>
      ) : (
        <>
          <ProgressiveBlur direction='to right' minBlur={0} maxBlur={32} layers={4} width={width} opacity={opacity} />
          <SidebarGradient opacity={opacity} width={width} showSidebar={showSidebar} toggleSidebar={toggleSidebar} />
        </>
      )}
    </div>
  )
}

/** The sidebar component. */
const Sidebar = () => {
  // ============================
  // State
  // ============================
  const [isSwiping, setIsSwiping] = useState(false)
  const showSidebar = useSelector(state => state.showSidebar)
  const fontSize = useSelector(state => state.fontSize)
  const longPressState = useSelector(state => state.longPress)
  const dispatch = useDispatch()
  const [sectionId, setSectionId] = useState<SidebarSectionId>('favorites')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [dropdownHeight, setDropdownHeight] = useState(0)
  const innerWidth = viewportStore.useSelector(state => state.innerWidth)

  /** Hue rotation motion value – takes the shortest path around the color wheel. */
  const hue = useMotionValue(0)
  const sat = useMotionValue(1)

  // Animate hue/saturate when section changes, taking the shortest path
  useEffect(() => {
    const section = SECTIONS.find(s => s.id === sectionId)!
    const currentHue = hue.get()
    // Normalize current to [0, 360) then find shortest-path diff in [-180, 180]
    let diff = section.hue - (((currentHue % 360) + 360) % 360)
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    const t = { duration: durations.get('slow') / 1000, ease: EASE_OUT }
    animate(hue, currentHue + diff, t)
    animate(sat, section.saturate, t)
  }, [sectionId])

  // Close the dropdown when the sidebar closes
  useEffect(() => {
    if (!showSidebar) setDropdownOpen(false)
  }, [showSidebar])

  // ============================
  // Refs
  // ============================

  /** Ref to the drawer element, used to detect if touches are inside the drawer. */
  const drawerRef = useRef<HTMLDivElement>(null)

  /** MUI-style uncertainty threshold for direction detection (in pixels). */
  const UNCERTAINTY_THRESHOLD = 3

  /**
   * Swipe state for manual touch handling (MUI's SwipeableDrawer pattern).
   * We handle all touches manually instead of using Framer Motion's drag,
   * because FM's drag doesn't have a "wait and see" phase for direction detection.
   */
  const swipeState = useRef({
    /** Whether a touch is currently being tracked. */
    active: false,
    /** Whether we've determined the swipe direction yet. Null means undetermined, true means horizontal, false means vertical. */
    isSwiping: null as boolean | null,
    /** Whether the touch started on the backdrop (outside drawer). */
    startedOnBackdrop: false,
    /** Whether the finger has entered the drawer area (for backdrop-initiated swipes). */
    drawerHit: false,
    /** Starting X position. */
    startX: 0,
    /** Starting Y position. */
    startY: 0,
    /** Timestamp of the last touch move, for velocity calculation. */
    lastTime: 0,
    /** The last x position, for velocity calculation. */
    lastX: 0,
    /** Accumulated velocity during the swipe. */
    velocity: 0,
  })

  // ============================
  // Derived values
  // ============================

  /** Dynamically determine the width of the sidebar. */
  const width = innerWidth < 768 ? '100%' : '400px'

  /** Get the width of the sidebar in pixels, which is used for progress-based animations. */
  const widthPx = innerWidth < 768 ? innerWidth : 400

  /** Track the current x position of the sidebar. Used for animations and swipe tracking. */
  const x = useMotionValue(showSidebar ? 0 : -widthPx)

  /** Fade sidebar content with a quadratic ease – stays readable while mostly open, fades as it nears the edge. */
  const contentOpacity = useTransform(useTransform(x, [-widthPx, 0], [0, 1]), v => v * v)

  /** Cubic-bezier transition – ease-out for both open and close. Close uses a gentler ease-out (less aggressive start). */
  const transition = useMemo(
    () => ({
      duration: durations.get('medium') / 1000,
      ease: showSidebar ? EASE_OUT : EASE_OUT_GENTLE,
    }),
    [showSidebar],
  )

  // ============================
  // Callbacks
  // ============================

  /** Toggle the sidebar open/closed. */
  const toggleSidebar = useCallback(
    (value: boolean) => {
      dispatch([toggleSidebarActionCreator({ value })])
    },
    [dispatch],
  )

  /**
   * Shared logic for deciding whether to close the sidebar or snap it back after a swipe.
   */
  const handleSwipeEnd = useCallback(
    (offset: number, velocity: number) => {
      // Combined score: offset and velocity can compensate for each other.
      // Fast + short swipes, or slow + long drags, should both be able to close the drawer.
      const closeScore = offset + velocity * 0.5
      const closeThreshold = 150

      if (closeScore > closeThreshold) {
        toggleSidebar(false)
      } else {
        // Score too low - snap back to open position
        animate(x, 0, transition)
      }
    },
    [toggleSidebar, x, transition],
  )

  // ============================
  // Effects
  // ============================

  /** Lock body scroll when sidebar is open. */
  useEffect(() => {
    if (showSidebar) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showSidebar])

  /** Handle escape key to close sidebar. */
  useEffect(() => {
    if (!showSidebar) return

    /** Close sidebar when Escape is pressed. */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleSidebar(false)
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showSidebar, toggleSidebar])

  /**
   * Handle all swipes, including those that begin outside the drawer.
   * This logic is adapted from MUI's SwipeableDrawer implementation.
   *
   * Key differences from Framer Motion's drag:
   * - We detect touches that originate outside the drawer.
   * - We wait until direction is clear (3px threshold) before committing to swipe vs scroll.
   * - Call preventDefault() to disable scrolling after the swipe threshold.
   */
  useEffect(() => {
    if (!showSidebar) return

    /** Handle touch start event – record the position of the touch and set up event listeners for touch move and touch end. */
    const handleTouchStart = (e: TouchEvent) => {
      const touchX = e.touches[0].clientX
      const touchY = e.touches[0].clientY
      const startedOnBackdrop = !drawerRef.current?.contains(e.target as Node)

      // Reset swipe state
      swipeState.current = {
        active: true,
        isSwiping: null, // Direction not yet determined
        startedOnBackdrop,
        drawerHit: !startedOnBackdrop, // If started inside drawer, we've already "hit" it
        startX: touchX,
        startY: touchY,
        lastTime: performance.now(),
        lastX: touchX,
        velocity: 0,
      }
    }

    /** Handle touch move – handle touch move event and update drawer position based on swipe direction. */
    const handleTouchMove = (e: TouchEvent) => {
      const swipe = swipeState.current
      if (!swipe.active) return

      // Don't swipe the sidebar closed while a thought is being dragged
      if (longPressRef.current === LongPressState.DragHold || longPressRef.current === LongPressState.DragInProgress)
        return

      // Immediately prevent default for all backdrop-initiated touches. There's nothing
      // scrollable on the backdrop, and waiting for the 3px direction-detection threshold
      // gives Android enough time to start its overscroll bounce animation.
      if (swipe.startedOnBackdrop && e.cancelable) {
        e.preventDefault()
      }

      const touchX = e.touches[0].clientX
      const touchY = e.touches[0].clientY
      const now = performance.now()

      // Calculate velocity (smoothed, like MUI)
      const dt = now - swipe.lastTime
      if (dt > 0) {
        const instantVelocity = ((swipe.lastX - touchX) / dt) * 1000 // px/s, positive = moving left
        swipe.velocity = swipe.velocity * 0.4 + instantVelocity * 0.6
      }
      swipe.lastTime = now
      swipe.lastX = touchX

      // For backdrop-initiated swipes, check if finger has entered the drawer
      if (swipe.startedOnBackdrop && !swipe.drawerHit) {
        if (touchX < widthPx) {
          // Finger just entered drawer - "pick it up"
          swipe.drawerHit = true
          swipe.startX = touchX
          swipe.startY = touchY
        } else {
          // Finger still outside drawer - don't move drawer yet
          return
        }
      }

      // Direction detection (MUI-style): Wait until we exceed the uncertainty threshold
      if (swipe.isSwiping === null) {
        const dx = Math.abs(touchX - swipe.startX)
        const dy = Math.abs(touchY - swipe.startY)

        // Not enough movement yet to determine direction
        if (dx < UNCERTAINTY_THRESHOLD && dy < UNCERTAINTY_THRESHOLD) {
          return
        }

        // Determine direction: horizontal swipe (close drawer) or vertical scroll
        const isHorizontal = dx > dy

        if (isHorizontal) {
          // It's a horizontal swipe - we'll handle it
          swipe.isSwiping = true
          // Reset start position to current position for smoother tracking
          swipe.startX = touchX
          setIsSwiping(true)
        } else {
          // It's a vertical scroll - let the browser handle it
          swipe.isSwiping = false
          return
        }
      }

      // If we determined this is a scroll (not a swipe), ignore further moves
      if (!swipe.isSwiping) {
        return
      }

      // Move the drawer to follow the finger
      const dragOffset = touchX - swipe.startX // Negative when dragging left
      const newX = Math.max(-widthPx, Math.min(0, dragOffset)) // Clamp to valid range
      x.set(newX)

      // Prevent scrolling while swiping
      if (e.cancelable) {
        e.preventDefault()
      }
    }

    /** Handle touch end. */
    const handleTouchEnd = () => {
      const swipe = swipeState.current
      if (!swipe.active) return

      // Only process if we were actually swiping
      if (swipe.isSwiping && swipe.drawerHit) {
        const offset = Math.abs(x.get())
        const velocity = Math.max(swipe.velocity, 0)
        handleSwipeEnd(offset, velocity)
      }

      // Reset state
      swipe.active = false
      swipe.isSwiping = null
      swipe.drawerHit = false
      setIsSwiping(false)
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [showSidebar, widthPx, x, handleSwipeEnd])

  return (
    <>
      <Dialog.Root open={showSidebar} onOpenChange={toggleSidebar} modal={false}>
        {/* forceMount prop keeps the sidebar mounted when closed.
        this is temporarily added to match the behavior of the outgoing MUI drawer
        it can be removed in a later PR to optimize performance */}
        <Dialog.Portal forceMount>
          <div
            data-testid='sidebar'
            aria-hidden={!showSidebar}
            className={css({
              position: 'fixed',
              inset: 0,
              zIndex: 'sidebar',
              pointerEvents: 'none',
              userSelect: 'none',
            })}
          >
            <SidebarBackground
              x={x}
              widthPx={widthPx}
              showSidebar={showSidebar}
              toggleSidebar={toggleSidebar}
              width={width}
            />

            <SidebarOverlay1 width={width} opacity={contentOpacity} expanded={dropdownOpen} expandedHeight={dropdownHeight} hue={hue} sat={sat} />
            <SidebarOverlay2 width={width} opacity={contentOpacity} hue={hue} sat={sat} />

            <Dialog.Content
              asChild
              forceMount
              onOpenAutoFocus={e => e.preventDefault()} // Prevents focus from entering the sidebar when the page first loads
              onInteractOutside={e => e.preventDefault()} // This is needed to prevent the sidebar from double-toggling when tapping hamburger icon
              onEscapeKeyDown={e => e.preventDefault()} // Stop Radix from closing the sidebar when esc is pressed – we will handle it ourselves
              aria-describedby={undefined} // Suppress Radix console warning about aria-describedby. This property isn't relevant in this case.
            >
              <motion.div
                ref={drawerRef}
                style={{ x, opacity: contentOpacity }}
                initial={false}
                animate={{ x: showSidebar ? 0 : -widthPx }}
                transition={transition}
                className={css({
                  position: 'fixed',
                  top: 'safeAreaTop',
                  left: 0,
                  bottom: 0,
                  width,
                  backgroundColor: 'transparent',
                  zIndex: 'sidebar',
                  userSelect: 'none',
                  outline: 'none',
                  pointerEvents: 'auto',
                })}
              >
                {/* Tap zone on the right 10% of the sidebar to close it on mobile */}
                {innerWidth < 768 && (
                  <div
                    aria-hidden='true'
                    onClick={() => toggleSidebar(false)}
                    className={css({
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      width: '10%',
                      zIndex: 1,
                      cursor: 'pointer',
                    })}
                  />
                )}

                <div
                  // We need to disable favorites drag-and-drop when the Sidebar is being slid close.
                  // We'll do this by checking the sidebar's x offset.
                  onTouchMove={_.throttle(
                    () => {
                      if (isSwiping) return
                      // If the sidebar's x-offset is 0, the sidebar isn't moving.
                      // Otherwise, it -is- moving, and we should disable drag-and-drop by setting isSwiping.
                      if (x.get() !== 0) {
                        setIsSwiping(true)
                        dispatch(longPress({ value: LongPressState.Inactive }))
                      }
                    },
                    10,
                    // no need to check on the first touchmove trigger since x has probably not changed yet
                    { leading: false },
                  )}
                  onTouchEnd={() => {
                    setIsSwiping(false)
                  }}
                  className={css({ height: '100%' })}
                >
                  <div
                    aria-label='sidebar'
                    className={css({
                      background: 'transparent',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      width: '100%',
                      height: '100%',
                      color: 'fg',
                      lineHeight: 1.8,
                      userSelect: 'none',
                      position: 'relative',
                      padding: '0 1em',
                    })}
                  >
                    {/* Visually hidden title for screen readers */}
                    <VisuallyHidden.Root>
                      <Dialog.Title>{SECTIONS.find(s => s.id === sectionId)?.label}</Dialog.Title>
                    </VisuallyHidden.Root>

                    {/* Header – does not scroll */}
                    <FadeTransition type='fast' in={showSidebar}>
                      <div
                        style={{
                          marginTop: '3.75rem'
                        }}
                      >
                        <SidebarHeader
                          sections={SECTIONS}
                          sectionId={sectionId}
                          onSectionChange={setSectionId}
                          isOpen={dropdownOpen}
                          setIsOpen={setDropdownOpen}
                          onDropdownHeight={setDropdownHeight}
                        />
                      </div>
                    </FadeTransition>

                    {/* Scrollable content area */}
                    <motion.div
                      animate={{ paddingTop: dropdownOpen ? `${dropdownHeight}px` : '0px' }}
                      transition={{ duration: durations.get('medium') / 1000, ease: EASE_OUT }}
                      data-scroll-at-edge
                      onScroll={(e) => {
                        const scrolled = e.currentTarget.scrollTop > 0
                        if (scrolled !== isScrolled) setIsScrolled(scrolled)
                      }}
                      className={css({
                        flex: 1,
                        overflowY: dropdownOpen ? 'hidden' : 'scroll',
                        overflowX: 'hidden',
                        overscrollBehavior: 'contain',
                        scrollbarWidth: 'thin',
                        '&::-webkit-scrollbar': {
                          width: '0px',
                          background: 'transparent',
                          display: 'none',
                        },
                        // must be position:relative to ensure drop hovers are positioned correctly when sidebar is scrolled
                        position: 'relative',
                      })}
                      style={{
                        maskImage: isScrolled ? 'linear-gradient(to bottom, transparent, black 48px)' : 'none',
                        WebkitMaskImage: isScrolled ? 'linear-gradient(to bottom, transparent, black 48px)' : 'none',
                      }}
                    >
                      {sectionId === 'favorites' ? (
                        <Favorites disableDragAndDrop={isSwiping} />
                      ) : sectionId === 'recentlyEdited' ? (
                        <RecentlyEdited />
                      ) : sectionId === 'recentlyDeleted' ? (
                        <RecentlyDeleted />
                      ) : (
                        'Not yet implemented'
                      )}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

export default Sidebar
