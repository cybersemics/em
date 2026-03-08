/**
 * Sidebar.tsx
 *
 * The main sidebar component for the application. This sidebar slides in from
 * the left edge and provides access to three sections: Favorites, Recently
 * Edited, and Recently Deleted.
 *
 * Architecture overview:
 * - Uses Radix UI Dialog for accessibility (focus trapping, screen reader support)
 * - Uses Framer Motion for physics-based animations and gesture handling
 * - Implements custom touch/swipe handling adapted from MUI's SwipeableDrawer
 *   pattern, because Framer Motion's built-in drag doesn't support the
 *   "wait and see" direction detection phase we need
 * - Multiple visual overlay layers (SidebarOverlay1, SidebarOverlay2) create
 *   the glow/lighting effects behind the sidebar content
 * - Responsive: full-width on mobile (<768px), fixed 400px on desktop
 *
 * Component hierarchy:
 *   Sidebar (root)
 *   ├── SidebarBackground (dimming overlay + progressive blur + gradient)
 *   ├── SidebarOverlay1 (primary glow effect, lighten blend)
 *   ├── SidebarOverlay2 (secondary glow effect, screen blend)
 *   └── Dialog.Content (the actual drawer panel)
 *       ├── SidebarHeader (section picker with animated dropdown)
 *       │   └── SidebarSectionLabel (styled text label)
 *       └── Scrollable content area
 *           ├── Favorites
 *           ├── RecentlyEdited
 *           └── RecentlyDeleted
 */

import * as Dialog from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { AnimatePresence, MotionValue, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import _ from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
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

/**
 * Cubic-bezier ease-out curve used for most sidebar animations (opening, overlay transitions).
 * This is a fairly aggressive ease-out: the animation starts quickly and decelerates smoothly.
 * Control points: [x1, y1, x2, y2] per the CSS cubic-bezier() spec.
 */
const EASE_OUT = [0.16, 0.6, 0.2, 1] as const

/**
 * A gentler ease-out curve used specifically when *closing* the sidebar.
 * The less aggressive start (x1=0.25 vs 0.16) prevents the sidebar from
 * appearing to "jump" when the user releases their finger after a swipe.
 */
const EASE_OUT_GENTLE = [0.25, 0.1, 0.25, 1] as const

/** Valid sidebar section IDs – used as discriminated union for the active section. */
type SidebarSectionId = 'favorites' | 'recentlyEdited' | 'recentlyDeleted'

/**
 * Configuration for a sidebar section. Each section has:
 * - id: unique identifier used for state management
 * - label: display name shown in the header
 * - icon: React component rendered next to the label
 * - hue: CSS hue-rotate value (in degrees) applied to the glow overlays
 *         when this section is active, creating a distinct color tint per section
 * - saturate: CSS saturate multiplier for the glow overlays
 */
type SidebarSection = {
  id: SidebarSectionId
  label: string
  icon: React.ComponentType<{ size?: number; fill?: string }>
  hue: number
  saturate: number
}

/**
 * All available sidebar sections, in display order.
 * The hue values are chosen to create visually distinct color tints:
 * - Favorites: 0° (no rotation, uses the base overlay color)
 * - Recently Edited: -45° (shifts toward cooler/blue tones)
 * - Recently Deleted: 128° (shifts toward green/teal tones)
 */
const SECTIONS: SidebarSection[] = [
  { id: 'favorites', label: 'Favorites', icon: FavoritesIcon, hue: 0, saturate: 1 },
  { id: 'recentlyEdited', label: 'Recently Edited', icon: PencilIcon, hue: -45, saturate: 1.05 },
  { id: 'recentlyDeleted', label: 'Recently Deleted', icon: DeleteIcon, hue: 128, saturate: 1.1 },
]

/**
 * The header for the sidebar, which by default shows the icon and label
 * for the current SidebarSection. It can be tapped to toggle a dropdown
 * view, which shows all SidebarSections.
 *
 * When the dropdown is open:
 * - A full-screen backdrop with a subtle blur appears behind the dropdown
 *   (tapping it closes the dropdown)
 * - The non-active sections animate in from height:0 with opacity
 * - The scrollable content area below pushes down via animated paddingTop
 *   (handled by the parent Sidebar component using the onDropdownHeight callback)
 *
 * Props:
 * - sections: all available sidebar sections
 * - sectionId: the currently active section
 * - onSectionChange: callback when user selects a different section
 * - isOpen: whether the dropdown is currently expanded
 * - setIsOpen: toggle the dropdown open/closed
 * - onDropdownHeight: reports the pixel height of the dropdown when opened,
 *   so the parent can animate the content area down by the same amount
 */
const SidebarHeader = ({ sections, sectionId, onSectionChange, isOpen, setIsOpen, onDropdownHeight } : { sections: SidebarSection[], sectionId: SidebarSectionId, onSectionChange: (id: SidebarSectionId) => void, isOpen: boolean, setIsOpen: (open: boolean) => void, onDropdownHeight: (height: number) => void }) =>  {
  /** Ref to the dropdown container, used to measure its scrollHeight for the push-down animation. */
  const dropdownRef = useRef<HTMLDivElement>(null)

  /** The currently active section (always exists since sectionId comes from SECTIONS). */
  const section = sections.find((s) => s.id === sectionId)!

  /** Sections that are NOT currently active – these appear in the dropdown. */
  const otherSections = sections.filter((s) => s.id !== sectionId)

  /**
   * When the dropdown opens or the active section changes, measure the
   * dropdown's natural height and report it to the parent. The parent uses
   * this to animate the scrollable content area downward by the same amount,
   * creating a "push" effect rather than an overlay.
   */
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      onDropdownHeight(dropdownRef.current.scrollHeight)
    }
  }, [isOpen, sectionId])

  return (
    // position:relative creates a stacking context for the absolutely-positioned dropdown
    <div className={css({ position: 'relative', zIndex: 1 })}>
      {/* Clickable header row: icon + label + chevron */}
      <div
        {...fastClick(() => setIsOpen(!isOpen))}
        className={css({
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: 'pointer'
        })}
      >
        {/* Icon container – fixed 36x36 to maintain consistent alignment */}
        <div className={css({ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
          <section.icon size={28} fill='rgba(255, 255, 255, 0.75)' />
        </div>
        <SidebarSectionLabel active>{section.label}</SidebarSectionLabel>
        {/* Chevron rotates 180° when dropdown is open to indicate toggle state */}
        <ChevronImg
          onClickHandle={() => setIsOpen(!isOpen)}
          additonalStyle={{
            transition: 'transform 0.2s ease-out',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            opacity: 0.4
          }}
        />
      </div>

      {/* AnimatePresence enables exit animations for the dropdown when it unmounts */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/*
             * Full-screen backdrop behind the dropdown.
             * - Positioned absolutely starting from below the header row
             * - Has a subtle backdrop-filter blur to visually separate dropdown from content
             * - The -16px offsets and mask-image compensate for the blur's edge artifacts
             * - The nearly-transparent background (0.001 alpha) ensures the element is
             *   interactive (clickable to dismiss) without visually obstructing content
             */}
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
            {/*
             * Dropdown menu containing the non-active sections.
             * Animates from height:0 → auto using Framer Motion's layout animation.
             * Positioned absolutely below the header row so it doesn't affect
             * the header's layout.
             */}
            <motion.div
              ref={dropdownRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: durations.get('medium') / 1000, ease: EASE_OUT }}
              style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: '0rem', gap: '0.4rem' }}
            >
              {/* Render each non-active section as a clickable row */}
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
                    // Dimmed by default; brightens on hover (only on devices that support hover)
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

/**
 * A styled text label for a sidebar section name.
 * Used in both the header (for the active section) and the dropdown (for inactive sections).
 * The `active` prop is available for future styling differentiation but currently
 * both active and inactive labels share the same visual treatment.
 */
const SidebarSectionLabel = ({ children, active }: { children: React.ReactNode, active: boolean }) => {
  return (
    <div className={css({
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
 * sized in fixed px (derived from the source image's native 1482×744 dimensions)
 * so the crop region stays consistent regardless of container or viewport size.
 *
 * The image is positioned with a negative X offset to crop the left portion,
 * showing only the right ~80% of the glow. The element itself spans 100vw so
 * the glow bleeds beyond the sidebar edge on desktop.
 *
 * Animated properties:
 * - backgroundSize: scales from 50% → 75% of native height when dropdown expands
 * - backgroundPositionY: shifts upward on expand to keep the glow centered
 * - brightness: increases on expand to intensify the glow
 * - hue-rotate / saturate: driven by the parent's shared motion values to
 *   tint the glow when switching sidebar sections
 * - opacity: fades in/out with the sidebar open/close via the parent's contentOpacity
 */
const SidebarOverlay1 = ({ width, opacity, expanded, expandedHeight, hue, sat }: { width: string, opacity: MotionValue<number>, expanded: boolean, expandedHeight: number, hue: MotionValue<number>, sat: MotionValue<number> }) => {
  const brightness = useMotionValue(1)

  useEffect(() => {
    animate(brightness, expanded ? 1.4 : 1, { duration: durations.get('medium') / 1000, ease: EASE_OUT })
  }, [expanded])

  const filter = useTransform([brightness, hue, sat], ([b, h, s]) => `blur(4px) brightness(${b}) hue-rotate(${h}deg) saturate(${s})`)

  // Style variants for the collapsed and expanded states.
  // backgroundSize: fixed px values derived from the source image (1482×744).
  //   Width stays at 50% of native; height scales from 50% → 75% on expand.
  // backgroundPositionY: negative offset crops the top of the image, revealing
  //   only the lower glow region. Increases on expand to keep the glow centered.
  const safeY = (px: number) => `calc(${px}px + env(safe-area-inset-top, 0px))`
  const collapsed = { backgroundSize: 'calc(1482px * 0.475) calc(744px * 0.475)', backgroundPositionY: safeY(-84) }
  const open = { backgroundSize: 'calc(1482px * 0.475) calc(744px * 0.75)', backgroundPositionY: safeY(-144) }

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
        height: '100vh',
        width: '100vw',
        backgroundImage: 'url(/img/sidebar/overlay-layer-1-alpha.avif)',
        backgroundPositionX: '-150px',
        backgroundRepeat: 'no-repeat',
        mixBlendMode: 'lighten',
        pointerEvents: 'none',
        zIndex: 'sidebar',
      })}
    />
  )
}

/**
 * Secondary overlay layer that adds middle tones to the sidebar's colour blend.
 *
 * Unlike SidebarOverlay1 (which uses lighten blend mode and responds to the
 * dropdown expanded state), this overlay:
 * - Uses screen blend mode for softer, more subtle light mixing
 * - Applies a heavier blur (8px vs 4px) for a more diffuse effect
 * - Does not animate based on dropdown state (simpler, always the same)
 * - Covers the full height of the sidebar (top:0 to bottom:0)
 *
 * Together, the two overlays create a layered glow effect that shifts color
 * as the user switches between sidebar sections.
 */
const SidebarOverlay2 = ({ width, opacity, hue, sat }: { width: string, opacity: MotionValue<number>, hue: MotionValue<number>, sat: MotionValue<number> }) => {
  /** Combine hue-rotate and saturate into a single CSS filter string, driven by motion values. */
  const filter = useTransform([hue, sat], ([h, s]) => `blur(8px) hue-rotate(${h}deg) saturate(${s})`)

  return (
    <motion.div
      style={{ opacity, filter, width }}
      className={css({
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        backgroundImage: 'url(/img/sidebar/overlay-layer-2.avif)',
        backgroundSize: '90% 800px',
        backgroundPosition: 'top left',
        backgroundRepeat: 'no-repeat',
        mixBlendMode: 'normal',
        pointerEvents: 'none',
        zIndex: 'sidebar',
      })}
    />
  )
}

/**
 * The sidebar gradient overlay – a left-to-right linear gradient that darkens
 * the left edge of the viewport, creating a smooth visual transition between
 * the sidebar content and the main application content behind it.
 *
 * This gradient works in tandem with the ProgressiveBlur component. The
 * rendering order of these two components differs between Safari and Chrome
 * (see SidebarBackground) to avoid rendering artifacts specific to each engine.
 *
 * Clicking this overlay closes the sidebar (acts as a dismiss target).
 */
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

/**
 * The sidebar background – a fixed, full-screen layer that sits behind the
 * sidebar drawer. It provides three visual effects:
 *
 * 1. A dimming overlay that darkens the entire viewport (clicks it to dismiss)
 * 2. A ProgressiveBlur that gradually blurs the main content near the sidebar edge
 * 3. A SidebarGradient that provides a smooth color transition
 *
 * The opacity of all three effects is derived from the sidebar's x position,
 * with a cubic ease-in applied so the background fades in gently as the
 * sidebar slides open and catches up as it settles into place.
 *
 * Browser-specific rendering order:
 * - Safari/iOS: gradient is rendered ABOVE the blur (avoids patchy artifacts)
 * - Chrome: blur is rendered ABOVE the gradient (avoids visible banding)
 */
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

/**
 * The main Sidebar component.
 *
 * This component orchestrates the entire sidebar experience:
 * - Opening/closing via Redux state (showSidebar)
 * - Swipe-to-close gesture handling on touch devices
 * - Section switching (Favorites / Recently Edited / Recently Deleted)
 * - Visual overlay animations (glow effects that change color per section)
 * - Keyboard accessibility (Escape to close)
 * - Body scroll locking when open
 *
 * The sidebar is always mounted in the DOM (via Radix Dialog's forceMount)
 * to match legacy MUI drawer behavior. It slides in/out using Framer Motion's
 * x transform, with manual touch handling for swipe gestures.
 */
const Sidebar = () => {
  // ============================
  // State
  // ============================

  /** Whether the user is currently swiping the sidebar. When true, drag-and-drop
   * within Favorites is disabled to prevent conflicting gesture interactions. */
  const [isSwiping, setIsSwiping] = useState(false)

  /** Whether the sidebar is open – sourced from Redux store. */
  const showSidebar = useSelector(state => state.showSidebar)

  /** Current long-press state – used to prevent sidebar swipe-close during
   * thought drag-and-drop operations. */
  const longPressState = useSelector(state => state.longPress)
  const dispatch = useDispatch()

  /** Which section is currently displayed (favorites, recentlyEdited, recentlyDeleted). */
  const [sectionId, setSectionId] = useState<SidebarSectionId>('favorites')

  /** Whether the section picker dropdown in the header is expanded. */
  const [dropdownOpen, setDropdownOpen] = useState(false)

  /** Whether the scrollable content area has been scrolled down.
   * Used to conditionally show a top fade-out mask for scroll overflow indication. */
  const [isScrolled, setIsScrolled] = useState(false)

  /** The measured pixel height of the dropdown menu when expanded.
   * Used to animate the content area's paddingTop to "push" it down. */
  const [dropdownHeight, setDropdownHeight] = useState(0)

  /** Current viewport width from the viewport store – used for responsive
   * layout decisions (full-width vs fixed 400px). */
  const innerWidth = viewportStore.useSelector(state => state.innerWidth)

  /**
   * Motion values for the overlay glow color.
   * - hue: drives CSS hue-rotate() on overlay images. Accumulates continuously
   *   (not clamped to 0-360) so Framer Motion can interpolate shortest-path.
   * - sat: drives CSS saturate() on overlay images.
   * Both are shared across SidebarOverlay1 and SidebarOverlay2 via props.
   */
  const hue = useMotionValue(0)
  const sat = useMotionValue(1)

  /**
   * Animate hue/saturate when the active section changes.
   * Uses shortest-path calculation around the color wheel to avoid
   * the animation going "the long way around" (e.g., 350° → 10° should
   * go +20°, not -340°).
   */
  useEffect(() => {
    const section = SECTIONS.find(s => s.id === sectionId)!
    const currentHue = hue.get()
    // Normalize current hue to [0, 360) then find shortest-path diff in [-180, 180]
    let diff = section.hue - (((currentHue % 360) + 360) % 360)
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    const t = { duration: durations.get('slow') / 1000, ease: EASE_OUT }
    animate(hue, currentHue + diff, t)
    animate(sat, section.saturate, t)
  }, [sectionId])

  /** Reset the dropdown to closed whenever the sidebar itself closes,
   * so it doesn't appear pre-expanded next time the sidebar opens. */
  useEffect(() => {
    if (!showSidebar) setDropdownOpen(false)
  }, [showSidebar])

  // ============================
  // Refs
  // ============================

  /** Ref to the drawer element, used to detect if touches are inside the drawer. */
  const drawerRef = useRef<HTMLDivElement>(null)

  /** Mirror longPressState into a ref so document-level touch handlers always see the current value without re-registering. */
  const longPressRef = useRef(longPressState)
  longPressRef.current = longPressState

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

  /** Breakpoint (in px) at which the sidebar switches from full-width mobile to fixed-width desktop. */
  const desktopBreakpoint = parseInt(token('breakpoints.lg'))

  /**
   * Sidebar width as a CSS value.
   * - Mobile: full viewport width so the sidebar covers the entire screen
   * - Desktop: fixed 400px, leaving the main content partially visible
   */
  const width = innerWidth < desktopBreakpoint ? '100%' : '400px'

  /**
   * Sidebar width in raw pixels. Needed for:
   * - Calculating the off-screen x position (-widthPx = fully hidden)
   * - Progress-based animation transforms (mapping x position to opacity, etc.)
   * - Swipe gesture hit detection (checking if finger is within drawer bounds)
   */
  const widthPx = innerWidth < desktopBreakpoint ? innerWidth : 400

  /**
   * The current x-axis translation of the sidebar drawer.
   * - 0 = fully open (default position)
   * - -widthPx = fully closed (slid completely off-screen to the left)
   * This motion value is driven both by Framer Motion's animate prop and
   * by manual touch handling during swipe gestures (x.set()).
   */
  const x = useMotionValue(showSidebar ? 0 : -widthPx)

  /**
   * Opacity for the sidebar's content, derived from its x position.
   * Uses a two-stage transform:
   * 1. Linear map: x position → [0, 1] (fully closed → fully open)
   * 2. Quadratic ease: v² makes the content stay readable while the sidebar
   *    is mostly open, then fade rapidly as it approaches the edge.
   * This is applied to the drawer content AND the overlay layers.
   */
  const contentOpacity = useTransform(useTransform(x, [-widthPx, 0], [0, 1]), v => v * v)

  /**
   * Animation transition config, memoized to avoid recreating on every render.
   * Uses EASE_OUT (aggressive) when opening and EASE_OUT_GENTLE (softer) when
   * closing, so the close animation doesn't feel jarring after a finger release.
   */
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
   * Shared logic for deciding whether to close the sidebar or snap it back
   * after a swipe ends.
   *
   * Uses a combined "close score" that considers both how far the user dragged
   * (offset) and how fast they were moving (velocity). This allows two natural
   * gestures to close the sidebar:
   * - A slow, deliberate drag past the midpoint (high offset, low velocity)
   * - A quick flick that doesn't travel far (low offset, high velocity)
   *
   * @param offset - How far the sidebar has been dragged from its open position (px)
   * @param velocity - The instantaneous swipe velocity at release (px/s)
   */
  const handleSwipeEnd = useCallback(
    (offset: number, velocity: number) => {
      // Combined score: offset and velocity can compensate for each other.
      // The 0.5 multiplier on velocity means 1px of drag ≈ 2px/s of velocity.
      const closeScore = offset + velocity * 0.5
      const closeThreshold = 150

      if (closeScore > closeThreshold) {
        toggleSidebar(false)
      } else {
        // Score too low – the user didn't drag/flick hard enough, snap back to open
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
      {/*
       * Radix Dialog provides accessible modal behavior:
       * - Focus trapping within the sidebar when open
       * - Screen reader announcements
       * - Escape key handling (though we override it with our own handler)
       *
       * modal={false} is used because we handle backdrop clicks and escape
       * key ourselves, and we don't want Radix to add its own overlay.
       */}
      <Dialog.Root open={showSidebar} onOpenChange={toggleSidebar} modal={false}>
        {/*
         * forceMount keeps the sidebar mounted in the DOM even when closed.
         * This is temporarily added to match the behavior of the outgoing MUI drawer.
         * It can be removed in a later PR to optimize performance, but would require
         * ensuring that any state within the sidebar subtree is properly preserved.
         */}
        <Dialog.Portal forceMount>
          {/*
           * Root container for all sidebar layers. Fixed-positioned to cover
           * the entire viewport. pointerEvents:none allows clicks to pass through
           * to the main content; individual child layers opt-in to pointer events.
           */}
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
            {/* Background dimming/blur/gradient layer – sits behind everything */}
            <SidebarBackground
              x={x}
              widthPx={widthPx}
              showSidebar={showSidebar}
              toggleSidebar={toggleSidebar}
              width={width}
            />

            {/* Primary glow overlay (lighten blend) – responds to dropdown expansion */}
            <SidebarOverlay1 width={width} opacity={contentOpacity} expanded={dropdownOpen} expandedHeight={dropdownHeight} hue={hue} sat={sat} />
            {/* Secondary glow overlay (screen blend) – adds middle tones */}
            <SidebarOverlay2 width={width} opacity={contentOpacity} hue={hue} sat={sat} />

            {/*
             * Dialog.Content is the actual sidebar drawer panel.
             * - asChild: renders as its child (motion.div) instead of adding an extra DOM node
             * - forceMount: keeps content mounted even when dialog is closed
             * - onOpenAutoFocus: prevented to stop focus from jumping into the sidebar on page load
             * - onInteractOutside: prevented to avoid double-toggle when tapping the hamburger icon
             *   (our own backdrop click handler manages closing)
             * - onEscapeKeyDown: prevented because we handle Escape ourselves in a useEffect
             *   (Radix's built-in handler would close the dialog before our handler runs)
             */}
            <Dialog.Content
              asChild
              forceMount
              onOpenAutoFocus={e => e.preventDefault()}
              onInteractOutside={e => e.preventDefault()}
              onEscapeKeyDown={e => e.preventDefault()}
              aria-describedby={undefined} // Suppress Radix console warning – not applicable here
            >
              {/*
               * The drawer panel itself. Slides horizontally via the x motion value.
               * - initial={false}: skip the enter animation on first mount (prevents
               *   the sidebar from animating in when the page loads)
               * - animate: target x position based on open/closed state
               * - style.x: allows manual swipe control to override the animated value
               * - style.opacity: content fades with the quadratic contentOpacity curve
               */}
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
                {/*
                 * Mobile-only tap zone: an invisible strip on the right 10% of
                 * the full-width sidebar. Since the sidebar covers the entire
                 * screen on mobile, users need a way to close it without swiping.
                 * Tapping this strip closes the sidebar.
                 */}
                {innerWidth < desktopBreakpoint && (
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

                {/*
                 * Touch event wrapper that detects when the sidebar is being
                 * swiped closed and disables Favorites drag-and-drop to prevent
                 * conflicting gestures. The throttled onTouchMove checks the
                 * sidebar's x offset every 10ms (skipping the first trigger since
                 * x hasn't changed yet). If x !== 0, the sidebar is moving and
                 * we set isSwiping=true + cancel any active long press.
                 */}
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
                    })}
                  >
                    {/* Visually hidden title for screen readers – announces the active section name */}
                    <VisuallyHidden.Root>
                      <Dialog.Title>{SECTIONS.find(s => s.id === sectionId)?.label}</Dialog.Title>
                    </VisuallyHidden.Root>

                    {/*
                     * Header section (non-scrolling).
                     * Wrapped in FadeTransition so it fades in when the sidebar opens.
                     * The 3.75rem top margin provides spacing from the top of the viewport
                     * (below the safe area inset).
                     */}
                    <FadeTransition type='fast' in={showSidebar}>
                      <div
                        style={{
                          marginTop: '3.75rem',
                          padding: '0 1em',
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

                    {/*
                     * Scrollable content area – takes up remaining vertical space (flex:1).
                     *
                     * Key behaviors:
                     * - paddingTop animates to push content down when dropdown is open,
                     *   creating a smooth "push" effect rather than content overlap
                     * - Scrolling is disabled (overflowY:'hidden') while dropdown is open
                     *   to prevent conflicting scroll interactions
                     * - A top fade mask (linear-gradient) appears when scrolled down,
                     *   providing a visual cue that content extends above
                     * - overscrollBehavior:'contain' prevents scroll chaining to the
                     *   body (which is already scroll-locked via useEffect)
                     * - data-scroll-at-edge is a marker for external scroll detection
                     * - position:relative is required for correct drop hover positioning
                     *   in the Favorites drag-and-drop system
                     */}
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
                        overflowY: 'scroll',
                        overflowX: 'hidden',
                        overscrollBehavior: 'contain',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(255,255,255,0.3) transparent',
                        '&::-webkit-scrollbar': {
                          width: '0px',
                          background: 'transparent',
                          display: 'none',
                        },
                        position: 'relative',
                        padding: '0 1em',
                      })}
                      style={{
                        maskImage: isScrolled ? 'linear-gradient(to bottom, transparent, black 48px)' : 'none',
                        WebkitMaskImage: isScrolled ? 'linear-gradient(to bottom, transparent, black 48px)' : 'none',
                      }}
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
              </motion.div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

export default Sidebar
