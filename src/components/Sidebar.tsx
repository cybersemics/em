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
import { MotionValue, animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion'
import _ from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { sidebarContentMaskRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { toggleSidebarActionCreator } from '../actions/toggleSidebar'
import { isSafari } from '../browser'
import { LongPressState, Settings } from '../constants'
import useBreakpoint from '../hooks/useBreakpoint'
import getUserSetting from '../selectors/getUserSetting'
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

/** Duration (in seconds) of a single stage of the two-stage dropdown open/close animation.
 * The full animation takes 2 * STAGE_DURATION. Kept at module scope so both SidebarHeader
 * and the parent Sidebar component can reference it when coordinating the mask transition. */
const STAGE_DURATION = durations.get('medium') / 1000

/** Pixel offsets used by the scrollable content mask. The mask gradient has a 128px transparent
 * band followed by a 48px fade to black; these values slide that shape in and out of view. */
const DROPDOWN_MASK_OFFSET = -128
const SCROLL_HINT_MASK_OFFSET = -48

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
  /** All available sidebar sections. */
  sections: SidebarSection[]
  /** The currently active section. */
  sectionId: SidebarSectionId
  /** Callback when user selects a different section. */
  onSectionChange: (id: SidebarSectionId) => void
  /** Whether the dropdown is currently expanded. */
  isOpen: boolean
  /** State setter to toggle the dropdown open/closed. */
  setIsOpen: (open: boolean) => void
  /** True iff the current close is reversing an open that hadn't fully completed. When set,
   * close-side transitions drop their stage-1 hold so the partial open unwinds in place. */
  interrupted: boolean
  /** True when the dropdown's open animation has finished (past stage 1). Used by the
   * dropdown item click handler to decide whether a section change should fire immediately
   * or be deferred until the in-flight open has reversed cleanly. */
  openComplete: boolean
  /** Debug toggle: when true, use the single-stage animation B (selected slide and
   * non-selected fade-in/out happen concurrently in one stageDuration window). When false,
   * use the standard two-stage animation A. */
  animationB: boolean
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
 */
const SidebarHeader = ({
  sections,
  sectionId,
  onSectionChange,
  isOpen,
  setIsOpen,
  interrupted,
  openComplete,
  animationB,
}: SidebarHeaderProps) => {
  /** The currently active section. */
  const section = sections.find(s => s.id === sectionId)!

  /** Duration for each stage of the two-stage animation (in seconds). */
  const stageDuration = STAGE_DURATION

  /*
   * Two-stage animation schedule:
   * The dropdown open/close is choreographed as two back-to-back stages of equal length,
   * which is defined as `stageDuration`:
   *
   *   Opening:
   *     stage 1: selected item slides from header position down into the list along with color glow intensification
   *     stage 2: non-selected items fade in
   *
   *   Closing:
   *     stage 1: non-selected items fade out
   *     stage 2: selected item slides back up into the header position along with color glow dimming
   *
   * atStart / atEnd play at the very start/end of the animation, and are responsible for
   * swapping between the static header row at the top, and the *selected* item
   * inside the dropdown menu.
   *
   */
  // Animation B collapses stage 2 onto stage 1: there's only a single stageDuration window
  // for both open and close, so things that would normally wait one stage now fire immediately,
  // and things that would normally land at t=2·stage now land at t=stage.
  const stage1 = { duration: stageDuration, ease: EASE_OUT, delay: 0 }
  const stage2 = { duration: stageDuration, ease: EASE_OUT, delay: animationB ? 0 : stageDuration }
  const atStart = { duration: 0, delay: 0 }
  const atEnd = { duration: 0, delay: stageDuration * (animationB ? 1 : 2) }

  /*
   * Close transitions. `interrupted` is true if the open animation never finished,
   * so we just reverse the opening animation in place without any delays or the two-stage sequence.
   * When false (the dropdown was fully open before the close), we use the staged
   * choreography described above.
   */
  const closeSlide = interrupted ? stage1 : stage2
  const closeSelectedOpacity = interrupted ? { duration: 0, delay: stageDuration } : atEnd
  const closeHeaderRow = closeSelectedOpacity
  const closeChevron = interrupted
    ? { duration: stageDuration, ease: EASE_OUT, delay: 0 }
    : { duration: stageDuration, delay: stageDuration * (animationB ? 1 : 2), ease: EASE_OUT }

  /** Refs to each dropdown item's inner padded div, keyed by section id, for measuring Y offsets. */
  const itemEls = useRef<Record<string, HTMLDivElement | null>>({})

  /** Measure the selected item's SidebarSectionRow Y position within the dropdown container.
   * This is the distance the selected item must translate UP to overlay the header row at y=0.
   *
   * Implementation note: framer-motion applies a CSS transform to each item's motion.div wrapper
   * (via style.y). In Chromium/WebKit, an element with a transform becomes the offsetParent of
   * its descendants. That means sectionRow.offsetTop returns different things depending on
   * whether the motion.div currently has a transform:
   *   - With transform (e.g. closed state): offsetParent is the motion.div, so offsetTop only
   *     covers the inner div's paddingTop (~9px) and we have to add motion.div's own offsetTop.
   *   - Without transform (e.g. open state, transform: none): offsetParent skips the motion.div
   *     and is the dropdown container, so offsetTop already includes the motion.div's static y.
   * We branch on the actual offsetParent so the result is the same total (~54px for row 1)
   * either way. Without this, non-Favorites sections end up either way under-translated (only
   * ~9px) or over-translated (~99px) and the slide lands far from the header row. */
  const getSelectedOffset = useCallback(() => {
    const inner = itemEls.current[sectionId]
    const sectionRow = inner?.firstElementChild as HTMLElement | null
    const motionDiv = inner?.parentElement as HTMLElement | null
    if (sectionRow && motionDiv) {
      const includesMotionDivOffset = sectionRow.offsetParent !== motionDiv
      return sectionRow.offsetTop + (includesMotionDivOffset ? 0 : motionDiv.offsetTop)
    }
    // If the elements aren't mounted yet, estimate based on index * row height
    const idx = sections.findIndex(s => s.id === sectionId)
    return Math.max(0, idx) * 54
  }, [sectionId, sections])

  const selectedOffset = getSelectedOffset()

  return (
    // position:relative creates a stacking context for the absolutely-positioned dropdown.
    // this allows the dropdown's options to appear above the header without affecting the header's layout.
    <div
      data-testid='sidebar-section-picker'
      {...fastClick(() => setIsOpen(!isOpen))}
      className={css({ position: 'relative', cursor: 'pointer' })}
    >
      <div
        className={css({
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
        })}
      >
        {/*
         * Selected section row: instantly hidden when opening (selected dropdown item takes over),
         * instantly shown after the close slide completes.
         */}
        <motion.div
          initial={false}
          animate={{ opacity: isOpen ? 0 : 1 }}
          transition={isOpen ? atStart : closeHeaderRow}
        >
          <SidebarSectionRow icon={section.icon} label={section.label} />
        </motion.div>
        {/*
         * Chevron: fades out during stage 1 when opening, fades back in after the
         * close animation fully completes (delay of stage1 + stage2).
         */}
        <motion.div
          initial={false}
          animate={{ opacity: isOpen ? 0 : 1 }}
          transition={isOpen ? stage1 : closeChevron}
          className={css({ display: 'inline-flex' })}
        >
          <ChevronImg
            onClickHandle={() => setIsOpen(!isOpen)}
            additonalStyle={{
              opacity: 0.4,
            }}
          />
        </motion.div>
      </div>

      {/* Full-screen backdrop behind the dropdown. When clicked, it dismisses the dropdown. Fades concurrent with stage 1 in either direction. */}
      <motion.div
        initial={false}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={stage1}
        {...fastClick(() => setIsOpen(false))}
        className={css({
          position: 'absolute',
          zIndex: 1,
          top: '100%',
          left: 0,
          right: 0,
          height: '100vh',
          cursor: 'pointer',
          pointerEvents: isOpen ? 'auto' : 'none',
        })}
      />

      {/* Dropdown menu containing all sections in their original order. See stage schedule above for per-element timing. */}
      <div
        className={css({
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          width: '100%',
          pointerEvents: isOpen ? 'auto' : 'none',
        })}
      >
        {/* Blur backdrop – sits behind the menu items, blurs only the content visible through this region. Fades concurrent with stage 1 in either direction. */}
        <motion.div
          initial={false}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={stage1}
          className={css({
            position: 'absolute',
            top: '-48px',
            left: '-1em',
            right: '-1em',
            bottom: '-48px',
            zIndex: -1,
            maskImage: 'linear-gradient(to bottom, transparent, black 48px, black calc(100% - 48px), transparent)',
            ...(BLUR_ENABLED && { backdropFilter: 'blur(8px)' }),
          })}
        />
        {sections.map((s, i) => {
          const isSelected = s.id === sectionId
          return (
            <motion.div
              key={s.id}
              initial={false}
              animate={{
                opacity: isOpen ? 1 : 0,
                y: isSelected ? (isOpen ? 0 : -selectedOffset) : 0,
              }}
              transition={
                isSelected
                  ? {
                      // Selected item: opacity swaps instantly at the edges; y slides over one stage
                      // (stage 1 on open so the slide precedes the others fading in, stage 2 on close
                      // so the slide happens after the others have faded out — except on an interrupted
                      // close, where the slide unwinds immediately during stage 1).
                      opacity: isOpen ? atStart : closeSelectedOpacity,
                      y: isOpen ? stage1 : closeSlide,
                    }
                  : // Non-selected items: fade in during stage 2 on open, fade out during stage 1 on close.
                    isOpen
                    ? stage2
                    : stage1
              }
            >
              <div
                ref={(el: HTMLDivElement | null) => {
                  itemEls.current[s.id] = el
                }}
                data-testid={`sidebar-${s.id}`}
                {...fastClick(() => {
                  // Ignore taps until the slide (stage 1) has finished. During the slide the
                  // user can still interrupt via the header — which bubbles up via this
                  // element's parent click and closes the dropdown — but cannot pick a new
                  // section. This avoids the messy collision where a mid-slide section
                  // change leaves two items moving in opposite directions during the close.
                  if (!openComplete) return
                  onSectionChange(s.id)
                  setIsOpen(false)
                })}
                className={css({
                  cursor: 'pointer',
                  paddingTop: i === 0 ? 0 : '0.5rem',
                  paddingBottom: '0.5rem',
                  display: 'flex',
                  opacity: isSelected ? 1 : 0.6,
                  '@media (hover: hover)': { _hover: { opacity: 1 } },
                  '@media (hover: none)': { _active: { opacity: 1 } },
                  transition: 'opacity {durations.fast} ease-out',
                })}
              >
                <SidebarSectionRow icon={s.icon} label={s.label} iconSize={32} />
              </div>
            </motion.div>
          )
        })}
      </div>
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
 */
const SidebarOverlay1 = ({
  opacity,
  expanded,
  interrupted,
  animationB,
  hue,
  sat,
}: {
  /** Shared motion value providing opacity derived from the sidebar's x position. */
  opacity: MotionValue<number>
  /** Whether the dropdown is currently expanded. */
  expanded: boolean
  /** True if the current close is reversing an open that hadn't fully completed. */
  interrupted: boolean
  /** Debug toggle: single-stage open/close. Drops the stage-1 hold on close. */
  animationB: boolean
  /** Shared motion value driving CSS hue-rotate on the overlay. */
  hue: MotionValue<number>
  /** Shared motion value driving CSS saturate on the overlay. */
  sat: MotionValue<number>
}) => {
  /** Whether the viewport is at or above the lg breakpoint (landscape mobile and larger). */
  const isLargeDevice = useBreakpoint('lg')

  /** Local opacity that ramps from 0.8 (collapsed) to 1.0 (expanded) to intensify the glow when the dropdown opens. */
  const dropdownOpacity = useMotionValue(0.8)

  /** When the dropdown expansion state changes, animate the dropdownOpacity to create a subtle
   * intensification of the glow when the dropdown is open. Open runs during stage 1; close is
   * delayed to stage 2 so the glow holds its intensified state while the rest of stage 1 plays,
   * and only dims back once the title starts sliding up. */
  useEffect(() => {
    animate(dropdownOpacity, expanded ? 1 : 0.8, {
      duration: durations.get('medium') / 1000,
      ease: EASE_OUT,
      delay: expanded || interrupted || animationB ? 0 : STAGE_DURATION,
    })
  }, [expanded, interrupted, animationB, dropdownOpacity])

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
      // Open: start stretching immediately (stage 1). Close: hold the stretched state through
      // stage 1 and only begin shrinking during stage 2, in sync with the header-slide close.
      transition={{
        duration: durations.get('slow') / 1000,
        ease: EASE_OUT,
        delay: expanded || interrupted || animationB ? 0 : STAGE_DURATION,
      }}
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
 */
const SidebarOverlay2 = ({
  width,
  opacity,
  hue,
  sat,
}: {
  /** CSS width of the overlay (either '100%' or '400px'). */
  width: string
  /** Opacity derived from the sidebar's x position. */
  opacity: MotionValue<number>
  /** Shared motion value driving CSS hue-rotate on the overlay. */
  hue: MotionValue<number>
  /** Shared motion value driving CSS saturate on the overlay. */
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
 */
const SidebarGradient = ({
  opacity,
  width,
  showSidebar,
  toggleSidebar,
  hue,
  sat,
}: {
  /** Opacity derived from the sidebar's x position. */
  opacity: MotionValue<number>
  /** CSS width of the gradient overlay. */
  width: string
  /** Whether the sidebar is currently open. */
  showSidebar: boolean
  /** Callback to open/close the sidebar. */
  toggleSidebar: (value: boolean) => void
  /** Shared motion value driving CSS hue-rotate. */
  hue: MotionValue<number>
  /** Shared motion value driving CSS saturate. */
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
  /** The sidebar's current x-axis translation motion value. */
  x: MotionValue<number>
  /** Sidebar width in pixels, used to derive opacity from x position. */
  widthPx: number
  /** Whether the sidebar is currently open. */
  showSidebar: boolean
  /** Callback to open/close the sidebar. */
  toggleSidebar: (value: boolean) => void
  /** CSS width string for child overlay components. */
  width: string
  /** Shared motion value driving CSS hue-rotate. */
  hue: MotionValue<number>
  /** Shared motion value driving CSS saturate. */
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
 */
const useSectionHue = (/** The currently active sidebar section. */ sectionId: SidebarSectionId) => {
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

  /** Debug toggle: animation B replaces the two-stage open/close with a single combined
   * stage. Selected slide and non-selected fade-in/out happen concurrently in one
   * stageDuration window. Read from user settings via the OPTIONS panel. */
  const animationB = !!useSelector(getUserSetting(Settings.sidebarAnimationB))

  /** Current long-press state – used to prevent sidebar swipe-close during
   * thought drag-and-drop operations. */
  const longPressState = useSelector(state => state.longPress)
  const dispatch = useDispatch()

  /** Which section is currently selected. Updates immediately on dropdown selection so the header
   * label and hue can update during stage 2 of the close animation. */
  const [sectionId, setSectionId] = useState<SidebarSectionId>('favorites')

  /** Which section's content is currently rendered in the scroll area. Lags `sectionId` by one
   * full dropdown close animation so that the new section's children (with their own mount
   * animations, e.g. ContextBreadcrumbs' FadeTransition on each breadcrumb) don't fire while the
   * close is still playing — otherwise those child fade-ins read as "a mask revealing thoughts"
   * between stage 1 and stage 2 of the close. */
  const [displayedSectionId, setDisplayedSectionId] = useState<SidebarSectionId>('favorites')
  useEffect(() => {
    if (sectionId === displayedSectionId) return
    const id = setTimeout(
      () => setDisplayedSectionId(sectionId),
      STAGE_DURATION * (animationB ? 1 : 2) * 1000,
    )
    return () => clearTimeout(id)
  }, [sectionId, displayedSectionId, animationB])

  /** Whether the scrollable content area has been scrolled down.
   * Used to conditionally show a top fade-out mask for scroll overflow indication. */
  const [isScrolled, setIsScrolled] = useState(false)

  /** Current viewport width from the viewport store – used for responsive
   * layout decisions (full-width vs fixed size determined by SIDEBAR_WIDTH_PX). */
  const innerWidth = viewportStore.useSelector(state => state.innerWidth)

  /** Whether the dropdown is open. */
  const [dropdownOpen, setDropdownOpen] = useState(false)

  /** Whether the dropdown's open animation has progressed past stage 1 (the selected-item
   * slide). Used for two related things:
   *   1. Deciding whether a close is "interrupted" (and should reverse in place) vs. "staged"
   *      (the normal two-stage close).
   *   2. Gating dropdown-item taps: items only become tappable after stage 1, so during the
   *      slide the user can interrupt via the header/backdrop but cannot select another
   *      section. This prevents the messy "two items moving in opposite directions" close
   *      that otherwise happens when a section change collides with an in-flight slide.
   *
   * Initialized true so the very first close — there hasn't been an open yet — still
   * counts as "non-interrupted". */
  const [dropdownOpenComplete, setDropdownOpenComplete] = useState(true)
  useEffect(() => {
    if (!dropdownOpen) return
    setDropdownOpenComplete(false)
    const t = setTimeout(() => setDropdownOpenComplete(true), STAGE_DURATION * 1000)
    return () => clearTimeout(t)
  }, [dropdownOpen])
  /** True if we're currently closing an open that never finished. Stays stable across
   * the whole close because dropdownOpenComplete is only reset on the next open. */
  const closeInterrupted = !dropdownOpen && !dropdownOpenComplete

  /** Reset the dropdown and release focus whenever the sidebar closes. */
  useEffect(() => {
    if (!showSidebar) {
      setDropdownOpen(false)
    }
  }, [showSidebar])
  const { hue, sat } = useSectionHue(sectionId)

  /*
   * Scrollable content mask position, driven as two independent motion values that are
   * summed into a single mask-position-y. Splitting them lets the dropdown-hide slide
   * (asymmetric: stage 1 on open, stage 2 on close) and the scroll-hint fade (symmetric,
   * no delay) each have their own transition timing without fighting for the same
   * CSS transition slot.
   */
  const dropdownMaskY = useMotionValue(dropdownOpen ? 0 : DROPDOWN_MASK_OFFSET)
  const scrollHintMaskY = useMotionValue(isScrolled ? 0 : SCROLL_HINT_MASK_OFFSET)
  // The scroll-hint contribution is linearly blended in proportion to how closed the dropdown
  // is (0 when fully open, full weight when fully closed). This keeps the composition smooth
  // during the dropdown close animation.
  const maskPositionY = useTransform<number, string>(
    [dropdownMaskY, scrollHintMaskY],
    ([d, s]) => `${d + (s * d) / DROPDOWN_MASK_OFFSET}px`,
  )
  // Opacity is derived from dropdownMaskY so the dim-out stays in lockstep with the slide,
  // including the stage-2 delay on close. 1 when fully closed (mask offset = -128), 0.5 when open.
  const maskOpacity = useTransform(dropdownMaskY, v => 0.5 + (0.5 * v) / DROPDOWN_MASK_OFFSET)

  // TODO: remove debug instrumentation
  useMotionValueEvent(dropdownMaskY, 'change', v => {
    console.log(`[dropdownMaskY] ${performance.now().toFixed(0)} t=${v.toFixed(2)}`)
  })
  useMotionValueEvent(scrollHintMaskY, 'change', v => {
    console.log(`[scrollHintMaskY] ${performance.now().toFixed(0)} t=${v.toFixed(2)}`)
  })
  useMotionValueEvent(maskPositionY, 'change', v => {
    console.log(`[maskPositionY] ${performance.now().toFixed(0)} t=${v}`)
  })

  /** True while the dropdown close animation is running (stage 1 + stage 2 window). Used to
   * block the scroll-hint effect from interrupting the stage-2-delayed mask animation with a
   * zero-delay one if isScrolled happens to flip during the close (e.g. from a section swap
   * triggering an onScroll via scrollTop clamp). */
  const dropdownCloseInProgress = useRef(false)

  useEffect(() => {
    // TODO: remove debug
    console.log(
      `[dropdownMask EFFECT FIRES] ${performance.now().toFixed(0)} dropdownOpen=${dropdownOpen} current=${dropdownMaskY.get().toFixed(2)} interrupted=${closeInterrupted}`,
    )
    if (dropdownOpen) {
      // Open runs during stage 1 — start immediately, no delay.
      animate(dropdownMaskY, 0, { duration: STAGE_DURATION, ease: EASE_OUT })
      return
    }
    if (closeInterrupted || animationB) {
      // Reverse / single-stage close: animate immediately with no stage-1 hold. Framer
      // interpolates smoothly from whatever partial value dropdownMaskY currently holds.
      dropdownCloseInProgress.current = true
      animate(dropdownMaskY, DROPDOWN_MASK_OFFSET, { duration: STAGE_DURATION, ease: EASE_OUT })
      const clearId = setTimeout(() => {
        dropdownCloseInProgress.current = false
      }, STAGE_DURATION * 1000)
      return () => clearTimeout(clearId)
    }
    // Staged close runs during stage 2. Framer-motion's built-in `delay` option drops ~60ms
    // (4 frames) in practice, which causes the mask to start moving visibly in the last frames
    // of stage 1 instead of at the stage 1/2 boundary. We use an explicit setTimeout instead
    // for a guaranteed hold that lines up with the title-slide's stage 2 start.
    dropdownCloseInProgress.current = true
    const startId = setTimeout(() => {
      animate(dropdownMaskY, DROPDOWN_MASK_OFFSET, { duration: STAGE_DURATION, ease: EASE_OUT })
    }, STAGE_DURATION * 1000)
    const clearId = setTimeout(() => {
      dropdownCloseInProgress.current = false
    }, STAGE_DURATION * 2 * 1000)
    return () => {
      clearTimeout(startId)
      clearTimeout(clearId)
    }
  }, [dropdownOpen, dropdownMaskY, closeInterrupted, animationB])

  useEffect(() => {
    // Never interrupt the dropdown animation: while the dropdown is open or mid-close, the
    // dropdown effect owns mask timing.
    if (dropdownOpen || dropdownCloseInProgress.current) return
    animate(scrollHintMaskY, isScrolled ? 0 : SCROLL_HINT_MASK_OFFSET, {
      duration: STAGE_DURATION,
      ease: EASE_OUT,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScrolled])

  // ============================
  // Refs
  // ============================

  /** Ref to the drawer element, used to detect if touches are inside the drawer. */
  const drawerRef = useRef<HTMLDivElement>(null)

  /** Ref to the scrollable content area, used to compute the dropdown mask offset. */
  const contentRef = useRef<HTMLDivElement>(null)

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
   */
  const handleSwipeEnd = useCallback(
    (
      /** How far the sidebar has been dragged from its open position (px). */ offset: number,
      /** The instantaneous swipe velocity at release (px/s). */ velocity: number,
    ) => {
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
              hue={hue}
              sat={sat}
            />

            {/* Primary glow overlay – responds to dropdown expansion */}
            <SidebarOverlay1
              opacity={contentOpacity}
              expanded={dropdownOpen}
              interrupted={closeInterrupted}
              animationB={animationB}
              hue={hue}
              sat={sat}
            />
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
                          interrupted={closeInterrupted}
                          openComplete={dropdownOpenComplete}
                          animationB={animationB}
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
                      ref={contentRef}
                      data-scroll-at-edge
                      onScroll={e => {
                        const scrolled = e.currentTarget.scrollTop > 0
                        if (scrolled !== isScrolled) setIsScrolled(scrolled)
                      }}
                      style={
                        {
                          maskPositionY,
                          WebkitMaskPositionY: maskPositionY,
                          opacity: maskOpacity,
                        } as unknown as React.CSSProperties
                      }
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
                        sidebarContentMaskRecipe(),
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
