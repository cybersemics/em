/**
 * The main sidebar component for the application. This sidebar slides in from
 * the left edge and provides access to Favorites, Recently Edited, and Recently Deleted.
 *
 * Overview:
 * - Uses Radix UI Dialog for accessibility (focus trapping, screen reader support)
 * - Uses Framer Motion for physics-based animations and gesture handling
 * - Implements custom touch/swipe handling adapted from MUI's SwipeableDrawer pattern
 * - Multiple visual overlay layers (SidebarOverlay1, SidebarOverlay2) create
 * a liminal glow/lighting effects behind the sidebar content
 * - Responsive: full-width on small screens (<600px), fixed size determined by SIDEBAR_WIDTH_PX on landscape mobile and larger ("large devices").
 *
 * Component hierarchy:
 * Sidebar (root)
 * ├── SidebarBackground (dimming overlay + progressive blur + gradient)
 * ├── SidebarOverlay1 (primary glow effect, lighten blend)
 * ├── SidebarOverlay2 (secondary glow effect)
 * └── Dialog.Content (the actual drawer panel)
 * ├── SidebarHeader (section picker with animated dropdown)
 * │ └── SidebarSectionRow (icon + label)
 * └── Scrollable content area
 * ├── Favorites
 * ├── RecentlyEdited
 * └── RecentlyDeleted.
 */
import * as Dialog from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { AnimatePresence, MotionValue, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import _ from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { sidebarContentMaskRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { toggleSidebarActionCreator } from '../actions/toggleSidebar'
import { isSafari } from '../browser'
import { LongPressState } from '../constants'
import useBreakpoint from '../hooks/useBreakpoint'
import viewportStore from '../stores/viewport'
import durations from '../util/durations'
import fastClick from '../util/fastClick'
import safeY from '../util/safeY'
import ChevronImg from './ChevronImg'
import FadeTransition from './FadeTransition'
import Favorites from './Favorites'
import ProgressiveBlur from './ProgressiveBlur'
import RecentlyDeleted from './RecentlyDeleted'
import RecentlyEdited from './RecentlyEdited'
import DeleteIcon from './icons/DeleteIcon'
import FavoritesIcon from './icons/FavoritesIcon'
import PencilIcon from './icons/PencilIcon'

/**
 * Cubic-bezier ease-out curve used for most sidebar animations (opening, overlay transitions).
 * The animation starts quickly and decelerates smoothly.
 */
const EASE_OUT = [0.16, 0.6, 0.2, 1] as const

/**
 * A gentler ease-out curve used specifically when *closing* the sidebar.
 * The less aggressive start (0.25 vs 0.16) prevents the sidebar from
 * appearing to "jump" when the user releases their finger after a swipe.
 */
const EASE_OUT_GENTLE = [0.25, 0.1, 0.25, 1] as const

/** Whether to enable blur effects throughout the sidebar.
 * In Chromium, blur effects significantly reduce performance, so we disable them there. */
const BLUR_ENABLED = isSafari()

/** Fixed width of the sidebar on large devices (px). On small screens, the sidebar spans 100% of the viewport. */
const SIDEBAR_WIDTH_PX = 400

/** Valid sidebar section IDs. */
type SidebarSectionId = 'favorites' | 'recentlyEdited' | 'recentlyDeleted'

/**
 * Configuration for a sidebar section.
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
 * - Recently Edited: -45° (shifts toward cooler tones)
 * - Recently Deleted: 128° (shifts toward warmer tones).
 */
const SECTIONS: SidebarSection[] = [
  { id: 'favorites', label: 'Favorites', icon: FavoritesIcon, hue: 0, saturate: 1 },
  { id: 'recentlyEdited', label: 'Recently Edited', icon: PencilIcon, hue: -45, saturate: 1.05 },
  { id: 'recentlyDeleted', label: 'Recently Deleted', icon: DeleteIcon, hue: 128, saturate: 1.1 },
]

/** A sidebar section row: icon + label. Used for both the active header and dropdown items. */
const SidebarSectionRow = ({
  icon: Icon,
  label,
  iconSize = 28,
}: {
  icon: React.ComponentType<{ size?: number; fill?: string }>
  label: string
  iconSize?: number
}) => (
  <div className={css({ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' })}>
    <div
      className={css({
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      })}
    >
      <Icon size={iconSize} fill={token('colors.fgOverlay75')} />
    </div>
    <div
      className={css({
        color: 'fgOverlay75',
        fontSize: '1.4rem',
        lineHeight: '1.4rem',
        letterSpacing: '-0.25px',
        marginTop: 4,
        fontWeight: 300,
      })}
    >
      {label}
    </div>
  </div>
)

/** Props for the SidebarHeader component. */
interface SidebarHeaderProps {
  sections: SidebarSection[]
  sectionId: SidebarSectionId
  onSectionChange: (id: SidebarSectionId) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

/**
 * The header for the sidebar, which by default shows the icon and label
 * for the current SidebarSection. It can be tapped to toggle a dropdown
 * view, which shows all SidebarSections.
 *
 * When the dropdown is open:
 * - The non-active sections animate into view
 * - The scrollable content area gently fades out.
 *
 * @param sections - All available sidebar sections.
 * @param sectionId - The currently active section.
 * @param onSectionChange - Callback when user selects a different section.
 * @param isOpen - State determining whether the dropdown is currently expanded.
 * @param setIsOpen - State setter to toggle the dropdown open/closed.
 */
const SidebarHeader = ({ sections, sectionId, onSectionChange, isOpen, setIsOpen }: SidebarHeaderProps) => {
  /** The currently active section. */
  const section = sections.find(s => s.id === sectionId)!

  /** Sections that are NOT currently active – these appear in the dropdown. */
  const otherSections = sections.filter(s => s.id !== sectionId)

  return (
    // position:relative creates a stacking context for the absolutely-positioned dropdown.
    // this allows the dropdown's options to appear above the header without affecting the header's layout.
    <div className={css({ position: 'relative' })}>
      {/* Clickable header row: section row + chevron */}
      <div
        {...fastClick(() => setIsOpen(!isOpen))}
        className={css({
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: 'pointer',
        })}
      >
        <SidebarSectionRow icon={section.icon} label={section.label} />
        {/* Chevron rotates 180° when dropdown is open to indicate toggle state */}
        <ChevronImg
          onClickHandle={() => setIsOpen(!isOpen)}
          additonalStyle={{
            transition: `transform ${durations.get('fast')}ms ease-out`,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            opacity: 0.4,
          }}
        />
      </div>

      {/* AnimatePresence enables exit animations for the dropdown when it unmounts */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Full-screen backdrop behind the dropdown. When clicked, it dismisses the dropdown. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: durations.get('medium') / 1000, ease: EASE_OUT }}
              {...fastClick(() => setIsOpen(false))}
              className={css({
                position: 'absolute',
                zIndex: 1,
                top: '100%',
                left: 0,
                right: 0,
                height: '100vh',
                cursor: 'pointer',
              })}
            />
            {/*
             * Dropdown menu containing the non-active sections.
             * Fades in/out with opacity. Positioned absolutely below the header
             * row so it doesn't affect the header's layout.
             */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: durations.get('medium') / 1000, ease: EASE_OUT }}
              className={css({
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                marginTop: 0,
                gap: '0.5rem',
                width: '100%',
              })}
            >
              {/* Render each non-active section as a clickable row */}
              {otherSections.map(s => (
                <div
                  key={s.id}
                  {...fastClick(() => {
                    onSectionChange(s.id)
                    setIsOpen(false)
                  })}
                  className={css({
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                    display: 'flex',
                    // Dimmed by default; brightens on hover (only on devices that support hover)
                    opacity: 0.6,
                    '@media (hover: hover)': { _hover: { opacity: 1 } },
                    transition: `opacity ${durations.get('veryFast')}ms ease-out`,
                  })}
                >
                  <SidebarSectionRow icon={s.icon} label={s.label} iconSize={32} />
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
 * Glow overlay behind the sidebar header. Uses a background image and displays
 * a specific cropped region of that image.
 *
 * The image is positioned with a negative x offset to crop the left portion of the
 * image. The element itself spans 100vw so the glow bleeds beyond the sidebar edge on large devices.
 *
 * A bottom mask fades the image out for a smoother transition to the background.
 *
 * Animated styles that create a dynamic glow effect responding to user interactions:
 *
 * - backgroundSize: scales up when dropdown expands (with separate small/large screen strategies —
 * small screens scale both dimensions large to fill the full-width sidebar, large devices only scale height)
 * - backgroundPositionY: shifts upward on expand to keep the glow centered
 * - opacity: a local dropdownOpacity ramp (0.8 → 1.0) is multiplied with the parent's
 * contentOpacity to intensify the glow when the dropdown opens
 * - hue-rotate / saturate: driven by the parent's shared motion values to
 * tint the glow when switching sidebar sections.
 *
 * @param opacity - Shared motion value providing opacity derived from the sidebar's x position.
 * @param expanded - Whether the dropdown is currently expanded.
 * @param hue - Shared motion value driving CSS hue-rotate on the overlay.
 * @param sat - Shared motion value driving CSS saturate on the overlay.
 */
const SidebarOverlay1 = ({
  opacity,
  expanded,
  hue,
  sat,
}: {
  opacity: MotionValue<number>
  expanded: boolean
  hue: MotionValue<number>
  sat: MotionValue<number>
}) => {
  /** Whether the viewport is at or above the lg breakpoint (landscape mobile and larger). */
  const isLargeDevice = useBreakpoint('lg')

  /** Local opacity that ramps from 0.8 (collapsed) to 1.0 (expanded) to intensify the glow when the dropdown opens. */
  const dropdownOpacity = useMotionValue(0.8)

  /** When the dropdown expansion state changes, animate the dropdownOpacity to create a subtle intensification of the glow when the dropdown is open. */
  useEffect(() => {
    animate(dropdownOpacity, expanded ? 1 : 0.8, { duration: durations.get('medium') / 1000, ease: EASE_OUT })
  }, [expanded, dropdownOpacity])

  /** Combined opacity: parent's sidebar open/close opacity multiplied by the dropdown expansion ramp. */
  const combinedOpacity = useTransform([opacity, dropdownOpacity], ([o, d]: number[]) => o * d)

  // Applying blur to overlay images helps substantially with gradient banding artifacts in Safari,
  // with no observed performance impact – even on older/slower iPhones.
  // Unfortunately, banding is visible in Chromium regardless of blur, so we disable it here.
  const blur = BLUR_ENABLED ? 'blur(8px) ' : ''

  // Combine the hue, saturation and blur filters into a single CSS filter string.
  const filter = useTransform([hue, sat], ([h, s]) => `${blur}hue-rotate(${h}deg) saturate(${s})`)

  // Styles for collapsed and expanded states of the overlay.
  // backgroundSize: fixed px values derived from the source image (1482×744).
  // backgroundPositionY: negative offset crops the top of the image, revealing
  //   only the lower glow region. Increases on expand to keep the glow centered.
  //
  // Two sizing strategies for the expanded state:
  // - Small screens (full-width sidebar): scale both dimensions large with an x offset,
  //   so the glow fills the full-width sidebar.
  // - Large devices (fixed-width sidebar): keep width narrow and only scale height,
  //   which looks better when the sidebar is a fixed-width panel.
  const collapsed = { backgroundSize: 'calc(1482px * 0.425) calc(744px * 0.475)', backgroundPositionY: safeY(-84) }
  const open = isLargeDevice
    ? { backgroundSize: 'calc(1482px * 0.425) calc(744px * 0.825)', backgroundPositionY: safeY(-164) }
    : {
        backgroundSize: 'calc(1482px * 0.85) calc(744px * 0.85)',
        backgroundPositionY: safeY(-158),
        backgroundPositionX: '-320px',
      }

  return (
    <motion.div
      style={{ opacity: combinedOpacity, filter }}
      initial={collapsed}
      animate={expanded ? open : collapsed}
      transition={{ duration: durations.get('slow') / 1000, ease: EASE_OUT }}
      className={css({
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100vh',
        width: '100vw',
        backgroundImage: 'url(/img/sidebar/overlay-layer-1.avif)',
        backgroundPositionX: '-150px', // negative offset to crop the left edge of the image
        backgroundRepeat: 'no-repeat',
        pointerEvents: 'none',
        zIndex: 'sidebar',
        // fade out the bottom edge of the overlay on portrait mobile for a smoother transition to the background
        lgDown: {
          maskImage: 'linear-gradient(to top, transparent 200px, black 80%)',
        },
      })}
    />
  )
}

/**
 * Secondary overlay layer that adds middle tones to the sidebar's colour blend.
 *
 * Unlike SidebarOverlay1 (which uses lighten blend mode and responds to the
 * dropdown expanded state), this overlay:
 * - Doesn't need a blend mode
 * - Applies a heavier blur (8px vs 4px) for a more diffuse effect
 * - Does not animate based on dropdown state (simpler, always the same)
 * - Covers the full height of the sidebar (top:0 to bottom:0).
 *
 * Together, the two overlays create a layered glow effect that shifts color
 * as the user switches between sidebar sections.
 *
 * @param width - CSS width of the overlay (either '100%' or '400px').
 * @param opacity - Opacity derived from the sidebar's x position.
 * @param hue - Shared motion value driving CSS hue-rotate on the overlay.
 * @param sat - Shared motion value driving CSS saturate on the overlay.
 */
const SidebarOverlay2 = ({
  width,
  opacity,
  hue,
  sat,
}: {
  width: string
  opacity: MotionValue<number>
  hue: MotionValue<number>
  sat: MotionValue<number>
}) => {
  // Applying blur to overlay images helps substantially with gradient banding artifacts in Safari,
  // with no observed performance impact – even on older/slower iPhones.
  // Unfortunately, banding is visible in Chromium regardless of blur, so we disable it here.
  const blur = BLUR_ENABLED ? 'blur(8px) ' : ''

  // Combine the hue, saturation and blur filters into a single CSS filter string.
  const filter = useTransform([hue, sat], ([h, s]) => `${blur}hue-rotate(${h}deg) saturate(${s})`)

  return (
    <motion.div
      style={{ opacity, filter, width }}
      className={css({
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        backgroundImage: 'url(/img/sidebar/overlay-layer-2.avif)',
        backgroundSize: '100% 800px',
        backgroundPosition: 'top left',
        backgroundRepeat: 'no-repeat',
        pointerEvents: 'none',
        zIndex: 'sidebar',

        // on lg+ (landscape mobile and larger) screens, fade off the last 10% vertically to prevent a hard line at the bottom edge
        lg: {
          maskImage: 'linear-gradient(to right, black 95%, transparent 100%)',
        },
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
 *
 * @param opacity - Opacity derived from the sidebar's x position.
 * @param width - CSS width of the gradient overlay.
 * @param showSidebar - Whether the sidebar is currently open.
 * @param toggleSidebar - Callback to open/close the sidebar.
 * @param hue - Shared motion value driving CSS hue-rotate.
 * @param sat - Shared motion value driving CSS saturate.
 */
const SidebarGradient = ({
  opacity,
  width,
  showSidebar,
  toggleSidebar,
  hue,
  sat,
}: {
  opacity: MotionValue<number>
  width: string
  showSidebar: boolean
  toggleSidebar: (value: boolean) => void
  hue: MotionValue<number>
  sat: MotionValue<number>
}) => {
  const filter = useTransform([hue, sat], ([h, s]) => `hue-rotate(${h}deg) saturate(${s})`)

  return (
    <motion.div
      aria-label='sidebar-gradient'
      aria-hidden='true'
      style={{ opacity, filter }}
      onClick={() => toggleSidebar(false)}
      className={css({
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to right, {colors.sidebarBg} 0%, {colors.bgTransparent} 100%)',
        width,
        pointerEvents: showSidebar ? 'auto' : 'none',
        cursor: 'pointer',
        userSelect: 'none',
        // Safari doesn't repaint filter changes on this element unless the
        // element is promoted to its own compositing layer.
        willChange: 'filter',
      })}
    />
  )
}

/**
 * The sidebar background – a fixed, full-screen layer that sits behind the
 * sidebar drawer. It provides three visual effects:
 *
 * 1. A dimming overlay that darkens the entire viewport (clicks it to dismiss)
 * 2. A ProgressiveBlur that gradually blurs the main content near the sidebar edge
 * 3. A SidebarGradient that provides a smooth color transition.
 *
 * The opacity of all three effects is derived from the sidebar's x position,
 * with a cubic ease-in applied so the background fades in gently as the
 * sidebar slides open and catches up as it settles into place.
 *
 * Browser-specific rendering order:
 * - Safari/iOS: gradient is rendered ABOVE the blur (avoids patchy artifacts)
 * - Chrome: blur is rendered ABOVE the gradient (avoids visible banding).
 *
 * @param x - The sidebar's current x-axis translation motion value.
 * @param widthPx - Sidebar width in pixels, used to derive opacity from x position.
 * @param showSidebar - Whether the sidebar is currently open.
 * @param toggleSidebar - Callback to open/close the sidebar.
 * @param width - CSS width string for child overlay components.
 * @param hue - Shared motion value driving CSS hue-rotate.
 * @param sat - Shared motion value driving CSS saturate.
 */
const SidebarBackground = ({
  x,
  widthPx,
  showSidebar,
  toggleSidebar,
  width,
  hue,
  sat,
}: {
  x: MotionValue<number>
  widthPx: number
  showSidebar: boolean
  toggleSidebar: (value: boolean) => void
  width: string
  hue: MotionValue<number>
  sat: MotionValue<number>
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
          <SidebarGradient
            opacity={opacity}
            width={width}
            showSidebar={showSidebar}
            toggleSidebar={toggleSidebar}
            hue={hue}
            sat={sat}
          />
          <ProgressiveBlur direction='to right' minBlur={0} maxBlur={32} layers={4} width={width} opacity={opacity} />
        </>
      ) : (
        <>
          <ProgressiveBlur direction='to right' minBlur={0} maxBlur={32} layers={4} width={width} opacity={opacity} />
          <SidebarGradient
            opacity={opacity}
            width={width}
            showSidebar={showSidebar}
            toggleSidebar={toggleSidebar}
            hue={hue}
            sat={sat}
          />
        </>
      )}
    </div>
  )
}

/**
 * Manages the overlay glow color, animating hue and saturation when
 * the active sidebar section changes. Uses shortest-path calculation
 * around the color wheel to avoid the animation going "the long way
 * around" (e.g., 350deg to 10deg should go +20deg, not -340deg).
 *
 * @param sectionId - The currently active sidebar section.
 */
const useSectionHue = (sectionId: SidebarSectionId) => {
  /** Drives CSS hue-rotate() on overlay images. Accumulates continuously
   * (not clamped to 0-360) so Framer Motion can interpolate shortest-path. */
  const hue = useMotionValue(0)

  /** Drives CSS saturate() on overlay images. */
  const sat = useMotionValue(1)

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
  }, [sectionId, hue, sat])

  return { hue, sat }
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
 * - Body scroll locking when open.
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

  /** Whether the scrollable content area has been scrolled down.
   * Used to conditionally show a top fade-out mask for scroll overflow indication. */
  const [isScrolled, setIsScrolled] = useState(false)

  /** Current viewport width from the viewport store – used for responsive
   * layout decisions (full-width vs fixed size determined by SIDEBAR_WIDTH_PX). */
  const innerWidth = viewportStore.useSelector(state => state.innerWidth)

  /** Whether the dropdown is open. */
  const [dropdownOpen, setDropdownOpen] = useState(false)

  /** Reset the dropdown to closed whenever the sidebar itself closes. */
  useEffect(() => {
    if (!showSidebar) setDropdownOpen(false)
  }, [showSidebar])
  const { hue, sat } = useSectionHue(sectionId)

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

  const isLargeDevice = useBreakpoint('lg')

  /**
   * Sidebar width as a CSS value.
   * - Small screens: full viewport width so the sidebar covers the entire screen
   * - Large devices (lg+): fixed size determined by SIDEBAR_WIDTH_PX, leaving the main content partially visible.
   */
  const width = isLargeDevice ? `${SIDEBAR_WIDTH_PX}px` : '100%'

  /**
   * Sidebar width in raw pixels. Needed for:
   * - Calculating the off-screen x position (-widthPx = fully hidden)
   * - Progress-based animation transforms (mapping x position to opacity, etc.)
   * - Swipe gesture hit detection (checking if finger is within drawer bounds).
   */
  const widthPx = isLargeDevice ? SIDEBAR_WIDTH_PX : innerWidth

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
   * is mostly open, then fade rapidly as it approaches the edge.
   * This is applied to the drawer content AND the overlay layers.
   */
  const contentOpacity = useTransform(x, v => {
    const linear = Math.max(0, Math.min(1, (v + widthPx) / widthPx))
    return linear * linear
  })

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
   * - A quick flick that doesn't travel far (low offset, high velocity).
   *
   * @param offset - How far the sidebar has been dragged from its open position (px).
   * @param velocity - The instantaneous swipe velocity at release (px/s).
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

  /** Preload glow overlay images so they appear instantly when the sidebar first opens. */
  useEffect(() => {
    /** Decode an image so the browser caches it before it's needed. */
    const preload = async (src: string) => {
      const img = new Image()
      img.src = src
      await img.decode()
    }
    preload('/img/sidebar/overlay-layer-1.avif')
    preload('/img/sidebar/overlay-layer-2.avif')
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
              hue={hue}
              sat={sat}
            />

            {/* Primary glow overlay – responds to dropdown expansion */}
            <SidebarOverlay1 opacity={contentOpacity} expanded={dropdownOpen} hue={hue} sat={sat} />
            {/* Secondary glow overlay – adds middle tones */}
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
                 * Small-screen-only tap zone: an invisible strip on the right 10% of
                 * the full-width sidebar. Since the sidebar covers the entire
                 * screen on small devices, users need a way to close it without swiping.
                 * Tapping this strip closes the sidebar.
                 */}
                {!isLargeDevice && (
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
                      overflow: 'hidden',
                      isolation: 'isolate',
                      paddingLeft: 'env(safe-area-inset-left)', // prevent notch from clipping content in landscape
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

                    {/*
                     * Scrollable content area – takes up remaining vertical space (flex:1).
                     *
                     * Key behaviors:
                     * - Content fades out when dropdown is open
                     * - A top fade mask (linear-gradient) appears when scrolled down,
                     *   providing a visual cue that content extends above
                     * - overscrollBehavior:'contain' prevents scroll chaining to the
                     *   body (which is already scroll-locked via useEffect)
                     * - position:relative is required for correct drop hover positioning
                     *   in the Favorites drag-and-drop system
                     */}
                    <motion.div
                      animate={{
                        ...(BLUR_ENABLED
                          ? { filter: dropdownOpen ? 'blur(8px)' : 'blur(0px)' }
                          : { opacity: dropdownOpen ? 0.3 : 1 }),
                      }}
                      transition={{ duration: durations.get('medium') / 1000, ease: EASE_OUT }}
                      data-scroll-at-edge
                      onScroll={e => {
                        const scrolled = e.currentTarget.scrollTop > 0
                        if (scrolled !== isScrolled) setIsScrolled(scrolled)
                      }}
                      className={cx(
                        css({
                          flex: 1,
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
                        }),
                        sidebarContentMaskRecipe({ dropdownOpen, isScrolled }),
                      )}
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
