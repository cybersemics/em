/**
 * The main sidebar component for the application. This sidebar slides in from
 * the left edge and provides access to Favorites, Recently Edited, and Recently Deleted.
 *
 * Overview:
 * - Uses Radix UI Dialog for accessibility (focus trapping, screen reader support)
 * - Uses Framer Motion for animations and gesture handling (see Animation model)
 * - Implements custom touch/swipe handling adapted from MUI's SwipeableDrawer pattern
 * - SidebarGlow layers the primary and secondary overlays to create
 * a liminal glow/lighting effects behind the sidebar content
 * - Responsive: full-width on small screens (<600px), fixed size determined by SIDEBAR_WIDTH_PX on landscape mobile and larger ("large devices").
 *
 * Component hierarchy:
 * Sidebar (root)
 * ├── SidebarBackground (dimming overlay + progressive blur + gradient)
 * ├── SidebarGlow (primary glow effect + secondary glow effect)
 * └── Dialog.Content (the actual drawer panel)
 * ├── SidebarHeader (section picker with animated dropdown)
 * │ └── SidebarSectionRow (icon + label)
 * └── Scrollable content area
 * ├── Favorites
 * ├── RecentlyEdited
 * └── RecentlyDeleted.
 *
 * Animation model:
 * Framer Motion values drive animation without re-rendering React on each frame.
 *
 * There are four independent animation systems:
 * 1. Drawer slide. Triggered by `showSidebar`. This animates `MotionValue` `x`. Manual swipes drive
 * the `x` value directly. The position and opacity of sidebar layers derive from `x`.
 * 2. Section color tint. `sectionId` crossfades pre-tinted images and gradients.
 * 3. Sidebar dropdown. Triggered by `dropdownOpen`. Animates four values over STAGE_DURATION:
 * the opacity of dropdown item rows, the opacity of the chevron, the intensity of the sidebar headers' glow
 * (intensified when the dropdown is open), and a mask that dims the content of the sidebar underneath.
 * 4. Scroll-hint mask. `isScrolled` slides the content mask to add a top-edge fade.
 *
 */
import * as Dialog from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import _ from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../../styled-system/css'
import { sidebarContentMaskRecipe } from '../../../styled-system/recipes'
import { longPressActionCreator as longPress } from '../../actions/longPress'
import { toggleSidebarActionCreator } from '../../actions/toggleSidebar'
import { isAndroid } from '../../browser'
import { LongPressState, MASK_OVERSIZE } from '../../constants'
import useBreakpoint from '../../hooks/useBreakpoint'
import viewportStore from '../../stores/viewport'
import FadeTransition from '../FadeTransition'
import Favorites from '../Favorites'
import RecentlyDeleted from '../RecentlyDeleted'
import RecentlyEdited from '../RecentlyEdited'
import SidebarBackground from './SidebarBackground'
import SidebarGlow from './SidebarGlow'
import SidebarHeader from './SidebarHeader'
import {
  DROPDOWN_MASK_OFFSET,
  EASE_OUT,
  EASE_OUT_GENTLE,
  SCROLL_HINT_MASK_OFFSET,
  SIDEBAR_WIDTH_PX,
  STAGE_DURATION,
  cssEaseOut,
} from './sidebarConstants'
import { SECTIONS, SidebarSectionId } from './sidebarSections'
import useSidebarSwipe from './useSidebarSwipe'

/**
 * Top-level Sidebar component. Composes the background layers, glow overlays, drawer panel,
 * and section content. Handles open/close (Redux), swipe-to-close gestures, section
 * switching, Escape key, and body scroll lock.
 *
 * The drawer remains mounted through its close animation. Swipe gestures are handled manually
 * because framer-motion's drag has no "wait and see" phase for direction detection.
 */
const Sidebar = () => {
  // ============================
  // State
  // ============================

  /** Whether the sidebar is open. */
  const showSidebar = useSelector(state => state.showSidebar)

  /** Check if there is a long-press in progress anywhere in the app. If so, disable sidebar's swipe
   * gesture to prevent conflicts with thought drag-and-drop operations. */
  const longPressState = useSelector(state => state.longPress)
  const dispatch = useDispatch()

  /** Which section is currently selected. */
  const [sectionId, setSectionId] = useState<SidebarSectionId>('favorites')

  /** Whether the scrollable content area has been scrolled down.
   * Used to conditionally show a top fade-out mask for scroll overflow indication. */
  const [isScrolled, setIsScrolled] = useState(false)

  /** Current viewport width from the viewport store – used for responsive
   * layout decisions (full-width vs fixed size determined by SIDEBAR_WIDTH_PX). */
  const innerWidth = viewportStore.useSelector(state => state.innerWidth)

  /** Whether the dropdown is open. */
  const [dropdownOpen, setDropdownOpen] = useState(false)

  /** Reset the dropdown whenever the sidebar closes. */
  useEffect(() => {
    if (!showSidebar) {
      setDropdownOpen(false)
    }
  }, [showSidebar])

  /** Keep the subtree mounted until its close animation finishes. */
  const [drawerMounted, setDrawerMounted] = useState(showSidebar)

  // Slide the static mask carrier and counter-slide the scroller. This moves the gradient without
  // repainting or moving the content. The carrier is oversized to keep the viewport covered.
  // Positions for the 128px dropdown band and 48px scroll fade:
  //   0     = band in place — the region under the open dropdown is hidden
  //   -128  = revealed, with the 48px scroll-hint fade at the top edge (list is scrolled)
  //   -176  = fully revealed (list at the top; no fade)
  const maskSlideY = dropdownOpen ? 0 : DROPDOWN_MASK_OFFSET + (isScrolled ? 0 : SCROLL_HINT_MASK_OFFSET)

  // ============================
  // Refs
  // ============================

  /** Ref to the drawer element, used to detect if touches are inside the drawer. */
  const drawerRef = useRef<HTMLDivElement>(null)

  /** Mirror longPressState into a ref so document-level touch handlers always see the current value without re-registering. */
  const longPressRef = useRef(longPressState)
  longPressRef.current = longPressState

  // ============================
  // Derived values
  // ============================

  const isLargeDevice = useBreakpoint('lg')

  /** Sidebar width as a CSS value: fixed on large devices (so the main content stays
   * partially visible), full-viewport on small screens. */
  const width = isLargeDevice ? `${SIDEBAR_WIDTH_PX}px` : '100%'

  /** Same as `width` but in raw px. Needed wherever we do arithmetic on the width — the
   * off-screen x position (-widthPx = fully hidden), x-to-opacity transforms, and swipe-
   * gesture hit detection. */
  const widthPx = isLargeDevice ? SIDEBAR_WIDTH_PX : innerWidth

  /** The drawer's x-axis translation. 0 = fully open, -widthPx = fully closed (off-screen
   * to the left). Driven by both framer-motion (during open/close animations) and direct
   * `x.set()` calls (during a swipe). */
  const x = useMotionValue(showSidebar ? 0 : -widthPx)

  useEffect(() => {
    if (showSidebar) {
      setDrawerMounted(true)
    } else if (x.get() === -widthPx) {
      // Framer does not fire onAnimationComplete when there is no distance to animate.
      setDrawerMounted(false)
    }
  }, [showSidebar, x, widthPx])

  /** Content opacity derived from x. Linear-maps x to [0,1] then squares it, so the content
   * stays readable while the sidebar is mostly open and fades rapidly as it approaches the
   * left edge. Applied to both the drawer content and the overlay layers. */
  const contentOpacity = useTransform(x, v => {
    const linear = Math.max(0, Math.min(1, (v + widthPx) / widthPx))
    return linear * linear
  })

  /** The open/close transition. */
  const transition = useMemo(
    () => ({
      duration: STAGE_DURATION,
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

  /** On swipe-release, decide whether to close the sidebar or snap it back open.
   *
   * Uses a combined "close score" of offset + 0.5·velocity so two distinct gestures both
   * close the sidebar: a slow drag past the midpoint, or a quick flick that didn't travel
   * far. The 0.5 weight is the px ↔ px/s exchange rate. */
  const handleSwipeEnd = useCallback(
    (
      /** Distance dragged from the open position, in px. */ offset: number,
      /** Instantaneous swipe velocity at release, in px/s. */ velocity: number,
    ) => {
      const closeScore = offset + velocity * 0.5
      const closeThreshold = 150

      if (closeScore > closeThreshold) {
        toggleSidebar(false)
      } else {
        // Not a hard enough drag/flick — snap the drawer back to fully open.
        animate(x, 0, transition)
      }
    },
    [toggleSidebar, x, transition],
  )

  // ============================
  // Effects
  // ============================

  /** Preload glow overlay images so they appear instantly when the sidebar first opens. */
  useEffect(() => {
    /** Decode an image so the browser caches it before it's needed. */
    const preload = async (src: string) => {
      const img = new Image()
      img.src = src
      await img.decode()
    }
    // Both engines use the pre-baked per-section variants (see bakedOverlay) — warm them so the
    // first section switch crossfades without a fetch/decode hitch mid-animation.
    for (const section of SECTIONS) {
      preload(`/img/sidebar/overlay-layer-1-${section.id}.avif`)
      preload(`/img/sidebar/overlay-layer-2-${section.id}.avif`)
    }
  }, [])

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

  /** Document-level swipe-to-close gesture, including swipes that begin on the backdrop. Owns the
   * `isSwiping` flag; `setIsSwiping` is shared because the drawer's onTouchMove also flips it. */
  const { isSwiping, setIsSwiping } = useSidebarSwipe({
    enabled: showSidebar,
    drawerRef,
    widthPx,
    x,
    isBlocked: () =>
      longPressRef.current === LongPressState.DragHold || longPressRef.current === LongPressState.DragInProgress,
    onSwipeEnd: handleSwipeEnd,
  })

  return (
    <>
      {/*
       * Radix Dialog provides accessible modal behavior:
       * - Focus trapping within the sidebar when open
       * - Screen reader announcements
       * - Escape key handling (though we override it with our own handler)
       *
       * modal={false} is used because we handle backdrop clicks and escape
       * key ourselves, and we don't want Radix to add its own overlay.
       */}
      <Dialog.Root open={showSidebar || drawerMounted} onOpenChange={toggleSidebar} modal={false}>
        <Dialog.Portal>
          <div
            data-testid='sidebar'
            inert={!showSidebar}
            className={css({
              position: 'fixed',
              inset: 0,
              zIndex: 'sidebar',
              pointerEvents: 'none',
              userSelect: 'none',
            })}
          >
            {/* Background dimming/blur/gradient layer – sits behind everything */}
            <SidebarBackground
              x={x}
              widthPx={widthPx}
              showSidebar={showSidebar}
              toggleSidebar={toggleSidebar}
              width={width}
              sectionId={sectionId}
            />

            {/* Primary and secondary glow overlays */}
            <SidebarGlow width={width} opacity={contentOpacity} expanded={dropdownOpen} sectionId={sectionId} />

            {/*
             * Dialog.Content is the actual sidebar drawer panel.
             * - asChild: renders as its child (motion.div) instead of adding an extra DOM node
             * - onOpenAutoFocus: prevented to stop focus from jumping into the sidebar on page load
             * - onInteractOutside: prevented to avoid double-toggle when tapping the hamburger icon
             *   (our own backdrop click handler manages closing)
             * - onEscapeKeyDown: prevented because we handle Escape ourselves in a useEffect
             *   (Radix's built-in handler would close the dialog before our handler runs)
             */}
            <Dialog.Content
              asChild
              onOpenAutoFocus={e => e.preventDefault()}
              onInteractOutside={e => e.preventDefault()}
              onEscapeKeyDown={e => e.preventDefault()}
              aria-describedby={undefined} // Suppress Radix console warning – not applicable here
            >
              {/* Unmount the drawer after its close animation. */}
              <motion.div
                ref={drawerRef}
                // width is inline because Panda cannot statically extract SIDEBAR_WIDTH_PX across
                // modules; in css() it emits no rule and the drawer collapses to its content width.
                style={{ x, opacity: contentOpacity, width }}
                initial={{ x: -widthPx }}
                animate={{ x: showSidebar ? 0 : -widthPx }}
                transition={transition}
                onAnimationComplete={() => {
                  if (!showSidebar) setDrawerMounted(false)
                }}
                onClickCapture={e => {
                  if (isLargeDevice) return

                  const { right, width } = e.currentTarget.getBoundingClientRect()
                  if (e.clientX < right - width * 0.1) return

                  e.preventDefault()
                  e.stopPropagation()
                  toggleSidebar(false)
                }}
                className={css({
                  position: 'fixed',
                  top: 'safeAreaTop',
                  left: 0,
                  bottom: 0,
                  backgroundColor: 'transparent',
                  zIndex: 'sidebar',
                  userSelect: 'none',
                  outline: 'none',
                  pointerEvents: 'auto',
                })}
              >
                {/* Detects when the sidebar is mid-swipe-close and disables Favorites
                    drag-and-drop so the two gestures don't fight. Throttles to once per 10ms;
                    leading:false skips the first event before x has moved. */}
                <div
                  onTouchMove={_.throttle(
                    () => {
                      if (isSwiping) return
                      if (x.get() !== 0) {
                        setIsSwiping(true)
                        dispatch(longPress({ value: LongPressState.Inactive }))
                      }
                    },
                    10,
                    { leading: false },
                  )}
                  onTouchEnd={() => {
                    setIsSwiping(false)
                  }}
                  className={css({ height: '100%' })}
                >
                  {/* Main sidebar content container – flex column layout */}
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
                      overflow: 'hidden',
                      isolation: 'isolate',
                      paddingLeft: 'env(safe-area-inset-left)', // prevent notch from clipping content in landscape
                    })}
                  >
                    {/* Visually hidden title for screen readers – announces the active section name */}
                    <VisuallyHidden.Root>
                      <Dialog.Title>{SECTIONS.find(s => s.id === sectionId)?.label}</Dialog.Title>
                    </VisuallyHidden.Root>

                    {/* Non-scrolling header. Fades in with the sidebar; the 3.75rem top margin
                        sits just below the safe-area inset. */}
                    <FadeTransition type='medium' in={showSidebar}>
                      <div
                        className={css({
                          marginTop: '3.75rem',
                          padding: '0 1em',
                        })}
                      >
                        <SidebarHeader
                          sections={SECTIONS}
                          sectionId={sectionId}
                          onSectionChange={setSectionId}
                          isOpen={dropdownOpen}
                          setIsOpen={setDropdownOpen}
                        />
                      </div>
                    </FadeTransition>

                    {/* The oversized mask carrier slides while the scroller counter-slides. */}
                    <div
                      className={css({
                        flex: 1,
                        minHeight: 0,
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                      })}
                    >
                      <div
                        style={{
                          // Cover the viewport at every mask position.
                          height: `calc(100% + ${MASK_OVERSIZE}px)`,
                          transform: `translateY(${maskSlideY}px)`,
                          transition: `transform ${STAGE_DURATION}s ${cssEaseOut}`,
                          // Let taps pass through the carrier; the scroller opts back in.
                          pointerEvents: 'none',
                          // Android: promote before the mask transition to avoid a one-frame blank.
                          willChange: isAndroid ? 'transform' : undefined,
                        }}
                        className={cx(
                          css({
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            left: 0,
                            display: 'flex',
                            flexDirection: 'column',
                          }),
                          sidebarContentMaskRecipe(),
                        )}
                      >
                        <motion.div
                          data-scroll-at-edge
                          onScroll={e => setIsScrolled(e.currentTarget.scrollTop > 0)}
                          style={{
                            // Keep the list stationary as its mask carrier moves.
                            height: `calc(100% - ${MASK_OVERSIZE}px)`,
                            transform: `translateY(${-maskSlideY}px)`,
                            // Dim the content while the dropdown is open.
                            opacity: dropdownOpen ? 0.5 : 1,
                            transition: `opacity ${STAGE_DURATION}s ${cssEaseOut}, transform ${STAGE_DURATION}s ${cssEaseOut}`,
                            pointerEvents: 'auto',
                            willChange: isAndroid ? 'opacity, transform' : undefined,
                          }}
                          className={css({
                            flexShrink: 0,
                            overflowY: 'scroll',
                            overflowX: 'hidden',
                            overscrollBehavior: 'contain',
                            scrollbarWidth: 'thin',
                            scrollbarColor: '{colors.fgOverlay30} transparent',
                            '&::-webkit-scrollbar': {
                              width: '0px',
                              background: 'transparent',
                              display: 'none',
                            },
                            position: 'relative',
                            padding: '0 1em',
                          })}
                        >
                          {/* Render the active section's content component */}
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
