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
 * └── SidebarDrawer (the drawer panel: Dialog.Content + slide animation + close gestures)
 * ├── SidebarHeader (section picker with animated dropdown)
 * │ └── SidebarSectionRow (icon + label)
 * └── SidebarContent (masked, scrollable content area)
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
 * 3. Sidebar dropdown. Triggered by `dropdownOpen`. Animates four values over MEDIUM_DURATION:
 * the opacity of dropdown item rows, the opacity of the chevron, the intensity of the sidebar headers' glow
 * (intensified when the dropdown is open), and a mask that dims the content of the sidebar underneath.
 * 4. Scroll-hint mask. `isScrolled` slides the content mask to add a top-edge fade.
 *
 */
import * as Dialog from '@radix-ui/react-dialog'
import { animate, useTransform } from 'framer-motion'
import _ from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { longPressActionCreator as longPress } from '../../actions/longPress'
import { toggleSidebarActionCreator } from '../../actions/toggleSidebar'
import { LongPressState } from '../../constants'
import useBreakpoint from '../../hooks/useBreakpoint'
import useLockBodyScroll from '../../hooks/useLockBodyScroll'
import usePrefetchImages from '../../hooks/usePrefetchImages'
import FadeTransition from '../FadeTransition'
import SidebarBackground from './SidebarBackground'
import SidebarContent from './SidebarContent'
import SidebarDrawer from './SidebarDrawer'
import SidebarGlow from './SidebarGlow'
import SidebarHeader from './SidebarHeader'
import { SECTIONS, SidebarSectionId } from './sidebarSections'
import useDrawerPosition from './useDrawerPosition'
import useDrawerWidth from './useDrawerWidth'
import useSidebarSwipe from './useSidebarSwipe'

/** Both engines use the pre-baked per-section variants (see SidebarGlow) — prefetched below so the
 * first section switch crossfades without a fetch/decode hitch mid-animation. */
const GLOW_OVERLAY_IMAGE_URLS = SECTIONS.flatMap(section => [
  `/img/sidebar/overlay-layer-1-${section.id}.avif`,
  `/img/sidebar/overlay-layer-2-${section.id}.avif`,
])

/**
 * Top-level Sidebar component. Composes the background layers, glow overlays, drawer, and
 * section content. Handles open/close (Redux), the gestures that can close the drawer (swipe
 * and edge-tap), section switching, Escape key, and body scroll lock.
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

  const dispatch = useDispatch()

  /** Which section is currently selected. */
  const [sectionId, setSectionId] = useState<SidebarSectionId>('favorites')

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

  // ============================
  // Refs
  // ============================

  /** Ref to the drawer element, used to detect if touches are inside the drawer. */
  const drawerRef = useRef<HTMLDivElement>(null)

  // ============================
  // Derived values
  // ============================

  /** True at runtime if the device is "large" (landscape mobile devices and larger). */
  const isLargeDevice = useBreakpoint('lg')

  /** Drawer width: the real pixel value for position/opacity math, and the CSS value to
   * render it at. */
  const { width, widthAsCssString } = useDrawerWidth(isLargeDevice)

  /** The drawer's position over time: where it sits (`x`) and how it gets there (`transition`). */
  const { x, transition } = useDrawerPosition(showSidebar, width)

  /** Content opacity derived from x. Linear-maps x to [0,1] then squares it, so the content
   * stays readable while the sidebar is mostly open and fades rapidly as it approaches the
   * left edge. Applied to both the drawer content and the overlay layers. */
  const contentOpacity = useTransform(x, v => {
    const linear = Math.max(0, Math.min(1, (v + width) / width))
    return linear * linear
  })

  // ============================
  // Close gestures
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

  /** Document-level swipe-to-close gesture, including swipes that begin on the backdrop. Owns the
   * `isSwiping` flag; `setIsSwiping` is shared because the drawer's own `onTouchMove` also flips it. */
  const { isSwiping, setIsSwiping } = useSidebarSwipe({
    enabled: showSidebar,
    drawerRef,
    width,
    x,
    onSwipeEnd: handleSwipeEnd,
  })

  /** Detects when the sidebar is mid-swipe-close and disables Favorites drag-and-drop so the
   * two gestures don't fight. Throttles to once per 10ms; leading:false skips the first
   * event before x has moved. */
  const handleDrawerTouchMove = useMemo(
    () =>
      _.throttle(
        () => {
          if (isSwiping) return
          if (x.get() !== 0) {
            setIsSwiping(true)
            dispatch(longPress({ value: LongPressState.Inactive }))
          }
        },
        10,
        { leading: false },
      ),
    [isSwiping, setIsSwiping, x, dispatch],
  )

  // ============================
  // Effects
  // ============================

  /** Keeps the drawer subtree mounted through its close animation, so it can be seen sliding out
   * instead of vanishing instantly. Opening mounts it immediately here, in time for the slide-in.
   * Closing normally unmounts it via `onAnimationComplete` (passed to SidebarDrawer below) once
   * the close animation actually finishes. This effect only handles the case where there's no
   * animation to finish: if `x` is already at the closed position when `showSidebar` flips false
   * — e.g. the drawer was swiped shut rather than toggled — Framer never fires
   * `onAnimationComplete`, since there's no distance to animate, so nothing else would unmount it. */
  useEffect(() => {
    if (showSidebar) {
      setDrawerMounted(true)
    } else if (x.get() === -width) {
      setDrawerMounted(false)
    }
  }, [showSidebar, x, width])

  /** Preload glow overlay images so they appear instantly when the sidebar first opens. */
  usePrefetchImages(GLOW_OVERLAY_IMAGE_URLS)

  /** Lock body scroll when sidebar is open. */
  useLockBodyScroll(showSidebar)

  /** Handle escape key to dismiss the sidebar one layer at a time: the dropdown first, then the
   * sidebar itself. */
  useEffect(() => {
    if (!showSidebar) return

    /** Close the dropdown if it is open, otherwise close the sidebar. */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dropdownOpen) {
          setDropdownOpen(false)
        } else {
          toggleSidebar(false)
        }
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showSidebar, dropdownOpen, toggleSidebar])

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
              width={width}
              showSidebar={showSidebar}
              toggleSidebar={toggleSidebar}
              widthAsCssString={widthAsCssString}
              sectionId={sectionId}
            />

            {/* Primary and secondary glow overlays */}
            <SidebarGlow
              widthAsCssString={widthAsCssString}
              opacity={contentOpacity}
              expanded={dropdownOpen}
              sectionId={sectionId}
            />

            {/* The sliding drawer panel — header and masked scrollable content */}
            <SidebarDrawer
              drawerRef={drawerRef}
              x={x}
              width={width}
              widthAsCssString={widthAsCssString}
              contentOpacity={contentOpacity}
              transition={transition}
              showSidebar={showSidebar}
              isLargeDevice={isLargeDevice}
              title={SECTIONS.find(s => s.id === sectionId)?.label ?? ''}
              onEdgeTap={() => toggleSidebar(false)}
              onAnimationComplete={() => {
                if (!showSidebar) setDrawerMounted(false)
              }}
              onTouchMove={handleDrawerTouchMove}
              onTouchEnd={() => setIsSwiping(false)}
            >
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

              {/* Masked, scrollable content area below the header */}
              <SidebarContent sectionId={sectionId} dropdownOpen={dropdownOpen} isSwiping={isSwiping} />
            </SidebarDrawer>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

export default Sidebar
