import * as Dialog from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import _ from 'lodash'
import { useCallback, useEffect, useRef, useState } from 'react'
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

  /**
   * Smoothed velocity for swipe-to-close detection.
   * Framer Motion only gives us the velocity at the moment of release, which can be
   * unreliable for quick flicks. We accumulate a smoothed velocity throughout the gesture
   * (identical to MUI's SwipeableDrawer approach).
   */
  const smoothedVelocity = useRef(0)

  /**
   * State for backdrop-initiated swipes (MUI's "paperHit" pattern).
   * When a touch starts on the backdrop and moves into the drawer, we track it here
   * so we can "pick up" the drawer and let the user swipe it closed.
   */
  const backdropSwipe = useRef({
    /** Whether a backdrop swipe is currently active. */
    active: false,
    /** Whether the finger has entered the drawer area (MUI calls this "paperHit"). */
    paperHit: false,
    /** The x position where the finger first entered the drawer. */
    startX: 0,
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
  const transition = {
    duration: durations.get('fast') / 1000,
    ease: [0, 0, 0.2, 1] as const,
  }

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
   * Used by both Framer Motion's drag handlers and backdrop swipe handlers.
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
   * Handle swipes that begin outside the drawer.
   * This logic is adapted from MUI's SwipeableDrawer implementation.
   *
   * When the user starts their swipe from outside the drawer – and then swipes left
   * _into_ the drawer, we want to "pick up" the drawer at the moment their finger
   * enters it, allowing them to swipe it closed in one continuous motion.
   *
   * This is how it works:
   * 1. Touch starts outside drawer (on backdrop): record the position of the touch
   * 2. Touch moves, but finger is still in backdrop area: do nothing (drawer stays put)
   * 3. Touch moves, and finger has entered drawer area: 'paperHit': drag begins via Framer Motion
   * 4. Subsequent moves → update drawer position relative to where finger entered
   */
  useEffect(() => {
    if (!showSidebar) return

    const handleTouchStart = (e: TouchEvent) => {
      // Ignore if touch started inside the drawer, as these are already handled by Framer Motion
      if (drawerRef.current?.contains(e.target as Node)) return

      // Record the position of the touch
      const touchX = e.touches[0].clientX

      // Reset backdrop swipe state
      backdropSwipe.current = {
        active: true,
        paperHit: false,
        startX: touchX,
        lastTime: performance.now(),
        lastX: touchX,
        velocity: 0,
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      const swipe = backdropSwipe.current
      if (!swipe.active) return

      const touchX = e.touches[0].clientX
      const now = performance.now()

      // Calculate velocity (smoothed, like MUI)
      const dt = now - swipe.lastTime
      if (dt > 0) {
        const instantVelocity = ((swipe.lastX - touchX) / dt) * 1000 // px/s, positive = moving left
        swipe.velocity = swipe.velocity * 0.4 + instantVelocity * 0.6
      }
      swipe.lastTime = now
      swipe.lastX = touchX

      // Check if finger has entered the drawer area
      if (!swipe.paperHit) {
        if (touchX < widthPx) {
          // Finger just entered drawer - "pick it up"
          swipe.paperHit = true
          swipe.startX = touchX // Reset start position to where finger entered
        } else {
          // Finger still outside drawer - don't move drawer yet
          return
        }
      }

      // Move the drawer to follow the finger
      const dragOffset = touchX - swipe.startX // Negative when dragging left
      const newX = Math.max(-widthPx, Math.min(0, dragOffset)) // Clamp to valid range
      x.set(newX)

      // Prevent scrolling while swiping
      e.preventDefault()
    }

    const handleTouchEnd = () => {
      const swipe = backdropSwipe.current
      if (!swipe.active) return

      // Only process if finger actually entered the drawer
      if (swipe.paperHit) {
        const offset = Math.abs(x.get())
        const velocity = Math.max(swipe.velocity, 0) // Use smoothed velocity
        handleSwipeEnd(offset, velocity)
      }

      // Reset state
      swipe.active = false
      swipe.paperHit = false
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
              drag='x'
              dragConstraints={{ left: -widthPx, right: 0 }}
              dragElastic={1e-9} // This disables elastic overscroll.
              onDragStart={() => {
                setIsSwiping(true)
                smoothedVelocity.current = 0
              }}
              onDrag={(e, info) => {
                // Accumulate smoothed velocity during the drag (MUI-style weighted average)
                smoothedVelocity.current = smoothedVelocity.current * 0.4 + Math.abs(info.velocity.x) * 0.6
              }}
              onDragEnd={(e, info) => {
                setIsSwiping(false)

                // Only consider closing if the swipe was to the left (negative offset)
                if (info.offset.x >= 0) {
                  animate(x, 0, transition)
                  return
                }

                const offset = Math.abs(info.offset.x)
                const velocity = Math.max(smoothedVelocity.current, Math.abs(info.velocity.x))
                handleSwipeEnd(offset, velocity)
              }}
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
