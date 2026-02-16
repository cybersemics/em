import * as Dialog from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import _ from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { toggleSidebarActionCreator } from '../actions/toggleSidebar'
import { LongPressState } from '../constants'
import viewportStore from '../stores/viewport'
import durations from '../util/durations'
import fastClick from '../util/fastClick'
import FadeTransition from './FadeTransition'
import Favorites from './Favorites'
import RecentlyDeleted from './RecentlyDeleted'
import RecentlyEdited from './RecentlyEdited'

/** Valid sidebar section IDs. */
type SidebarSectionId = 'favorites' | 'recentlyEdited' | 'recentlyDeleted'

/** Configuration for a sidebar section. */
type SidebarSection = {
  id: SidebarSectionId
  label: string
}

/** All available sidebar sections. */
const SECTIONS: SidebarSection[] = [
  { id: 'favorites', label: 'Favorites' },
  { id: 'recentlyEdited', label: 'Recently Edited' },
  { id: 'recentlyDeleted', label: 'Recently Deleted' },
]

/** A link to a sidebar section. */
const SidebarLink = ({
  active,
  section,
  setSection,
}: {
  active?: boolean
  section: SidebarSection
  setSection: (id: SidebarSectionId) => void
}) => {
  return (
    <a
      {...fastClick(() => setSection(section.id))}
      data-testid={`sidebar-${section.id}`}
      className={css({
        color: active ? 'fg' : 'gray50',
        display: 'inline-block',
        fontSize: '1.2em',
        fontWeight: 600,
        margin: '0.5em 1em 0 0',
        textDecoration: 'none',
      })}
    >
      {section.label}
    </a>
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
  const dispatch = useDispatch()
  const [sectionId, setSectionId] = useState<SidebarSectionId>('favorites')
  const innerWidth = viewportStore.useSelector(state => state.innerWidth)

  // ============================
  // Refs
  // ============================

  /** Ref to the drawer element, used to detect if touches are inside the drawer. */
  const drawerRef = useRef<HTMLDivElement>(null)

  /** Track the current x position of the sidebar. Used for animations and swipe tracking. */
  const x = useMotionValue(0)

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
  const width = innerWidth < 768 ? '90%' : '400px'

  /** Get the width of the sidebar in pixels, which is used for progress-based animations. */
  const widthPx = innerWidth < 768 ? innerWidth * 0.9 : 400

  /** Link opacity to x position of the sidebar. 1 when open, 0 when closed. */
  const opacity = useTransform(x, [-widthPx, 0], [0, 1])

  /** MUI-style cubic-bezier transition. */
  const transition = useMemo(
    () => ({
      duration: durations.get('fast') / 1000,
      ease: [0, 0, 0.2, 1] as const,
    }),
    [],
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
          {/* Backdrop/overlay */}
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
              style={{ x }}
              initial={false}
              animate={{ x: showSidebar ? 0 : -widthPx }}
              transition={transition}
              className={css({
                position: 'fixed',
                top: 'safeAreaTop',
                left: 0,
                bottom: 0,
                width,
                backgroundColor: 'sidebarBg',
                zIndex: 'sidebar',
                userSelect: 'none',
                boxShadow: '0 0 20px bgOverlay30',
                outline: 'none',
                pointerEvents: 'auto',
              })}
            >
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
                    background: 'sidebarBg',
                    overflowY: 'scroll',
                    overflowX: 'hidden',
                    overscrollBehavior: 'contain',
                    boxSizing: 'border-box',
                    width: '100%',
                    height: '100%',
                    color: 'fg',
                    scrollbarWidth: 'thin',
                    lineHeight: 1.8,
                    '&::-webkit-scrollbar': {
                      width: '0px',
                      background: 'transparent',
                      display: 'none',
                    },
                    userSelect: 'none',
                    // must be position:relative to ensure drop hovers are positioned correctly when sidebar is scrolled
                    position: 'relative',
                    padding: '0 1em',
                  })}
                  data-scroll-at-edge
                >
                  {/* Visually hidden title for screen readers */}
                  <VisuallyHidden.Root>
                    <Dialog.Title>{SECTIONS.find(s => s.id === sectionId)?.label}</Dialog.Title>
                  </VisuallyHidden.Root>

                  <FadeTransition type='fast' in={showSidebar}>
                    <div
                      style={{
                        // match HamburgerMenu width + padding
                        marginLeft: fontSize * 1.3 + 30,
                      }}
                    >
                      {SECTIONS.map(section => (
                        <SidebarLink
                          key={section.id}
                          active={sectionId === section.id}
                          section={section}
                          setSection={setSectionId}
                        />
                      ))}
                    </div>
                  </FadeTransition>

                  {sectionId === 'favorites' ? (
                    <Favorites disableDragAndDrop={isSwiping} />
                  ) : sectionId === 'recentlyEdited' ? (
                    <RecentlyEdited />
                  ) : sectionId === 'recentlyDeleted' ? (
                    <RecentlyDeleted />
                  ) : (
                    'Not yet implemented'
                  )}
                </div>
              </div>
            </motion.div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default Sidebar
