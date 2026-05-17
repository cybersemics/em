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
import { MotionValue, animate, motion, motionValue, useMotionValue, useTransform } from 'framer-motion'
import _ from 'lodash'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

/** Default ease-out used for most sidebar animations. */
const EASE_OUT = [0.16, 0.6, 0.2, 1] as const

/** Softer ease-out used when *closing* the sidebar. The less aggressive start prevents the
 * drawer from appearing to "jump" when the user releases a swipe. */
const EASE_OUT_GENTLE = [0.25, 0.1, 0.25, 1] as const

/** Backdrop-filter blur is too slow in Chromium to use freely, so we gate it to Safari. */
const BLUR_ENABLED = isSafari()

/** Duration (seconds) of the dropdown open/close animation. */
const STAGE_DURATION = durations.get('medium') / 1000

/** Y offsets that slide the scrollable content's mask in and out. The mask gradient is a
 * 128px transparent band followed by a 48px fade to black; these constants position that
 * shape relative to the scroll area's top edge. */
const DROPDOWN_MASK_OFFSET = -128
const SCROLL_HINT_MASK_OFFSET = -48

/** Fixed sidebar width on large devices (px). Small screens use 100vw. */
const SIDEBAR_WIDTH_PX = 400

/** Valid sidebar section IDs. */
type SidebarSectionId = 'favorites' | 'recentlyEdited' | 'recentlyDeleted'

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
  <div className={css({ display: 'flex', alignItems: 'center', gap: '0.75rem' })}>
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
}

/**
 * The header for the sidebar, which by default shows the icon and label
 * for the current SidebarSection. It can be tapped to toggle a dropdown
 * view, which shows all SidebarSections.
 *
 * Toggle animation: the selected item slides between the header position and its row in the
 * dropdown list while the non-selected items fade in/out. Both run concurrently over a single
 * STAGE_DURATION window. The scrollable content area below the header gently fades out
 * concurrently with the open.
 */
const SidebarHeader = ({ sections, sectionId, onSectionChange, isOpen, setIsOpen }: SidebarHeaderProps) => {
  /** The currently active section. */
  const section = sections.find(s => s.id === sectionId)!

  // Three framer-motion transition presets, all sharing the same animation window of
  // STAGE_DURATION seconds. Different motion.divs in the dropdown reach for different
  // ones depending on whether the property should tween or snap, and at which edge of
  // the window:
  //   slide   — tween smoothly across the whole window (the workhorse: y-translate, fades)
  //   atStart — duration 0; snap the property at the moment the open begins (t=0)
  //   atEnd   — duration 0 with delay = STAGE_DURATION; snap at the moment the close ends
  // The instant snaps exist so we can swap two stacked elements (e.g. the static header
  // row vs. the selected dropdown item) at exactly the start or end of the window without
  // an interpolated fade in between.
  const slide = { duration: STAGE_DURATION, ease: EASE_OUT, delay: 0 }
  const atStart = { duration: 0, delay: 0 }
  const atEnd = { duration: 0, delay: STAGE_DURATION }

  /** Refs to each dropdown item's inner div, keyed by section id. Used by getSelectedOffset
   * below to measure where the selected row currently sits, which determines how far the
   * selected item must translate up to land on the header row. */
  const itemEls = useRef<Record<string, HTMLDivElement | null>>({})

  /** One motion value per section driving its dropdown-item opacity. We control opacity
   * imperatively (instead of via animate prop + keyframes) so the selected item's "snap to
   * 1, hold, snap to 0 at the end of the close" can be expressed as exact zero-duration
   * `set()` calls. The declarative keyframe form has a non-zero interp window between
   * adjacent times — even when shrunk to <1ms, an unlucky rAF tick can sample inside it
   * and produce a sub-frame partial-opacity flicker right as the static header swaps in.
   * Imperative `set()` has no such window. */
  const itemOpacities = useRef<Record<string, MotionValue<number>>>({})
  sections.forEach(s => {
    if (!itemOpacities.current[s.id]) {
      itemOpacities.current[s.id] = motionValue(0)
    }
  })

  // Drive each item's opacity based on the open state and which section is selected. Re-runs
  // when sectionId changes — that's how mid-open section switches snap the newly-selected
  // item to full opacity before its slide to the header position. useLayoutEffect (rather
  // than useEffect) so the snap is applied between commit and paint, otherwise the first
  // post-tap paint can land before the snap and show a frame of the newly-selected item at
  // its mid-fade-in opacity — perceptible as a brief dim.
  useLayoutEffect(() => {
    const cancellers: (() => void)[] = []
    for (const s of sections) {
      const opacity = itemOpacities.current[s.id]
      const isSel = s.id === sectionId
      if (isOpen) {
        if (isSel) {
          // Selected during open: snap to 1. The static header simultaneously snaps to 0
          // (atStart), so this row visually takes its place and slides into the dropdown.
          opacity.set(1)
        } else {
          const controls = animate(opacity, 1, { duration: STAGE_DURATION, ease: EASE_OUT })
          cancellers.push(() => controls.stop())
        }
      } else {
        if (isSel) {
          // Selected during close: snap to 1, hold while sliding to the header position,
          // snap to 0 at the very end — exactly when the static header snaps to 1.
          // The snap-to-0 uses framer-motion's delay-based scheduling (same mechanism as
          // the static header's atEnd) so the two snaps land on the same rAF tick rather
          // than drifting by a frame, which would show as a flicker.
          opacity.set(1)
          const controls = animate(opacity, 0, { duration: 0, delay: STAGE_DURATION })
          cancellers.push(() => controls.stop())
        } else {
          const controls = animate(opacity, 0, { duration: STAGE_DURATION, ease: EASE_OUT })
          cancellers.push(() => controls.stop())
        }
      }
    }
    return () => cancellers.forEach(c => c())
  }, [isOpen, sectionId, sections])

  /** Returns the y-offset of the selected item's SidebarSectionRow within the dropdown
   * container — i.e. the distance the selected item must translate UP to overlay the
   * header row at y=0.
   *
   * Why the offsetParent branch: framer-motion applies a CSS transform to each item's
   * motion.div wrapper (via style.y). A transformed element becomes the offsetParent of
   * its descendants in both Chromium and WebKit, so sectionRow.offsetTop returns different
   * values depending on whether the motion.div currently has a transform applied. With a
   * transform (closed state) offsetParent is the motion.div, so offsetTop covers only the
   * inner div's padding (~9px) and we have to add the motion.div's own offsetTop. Without
   * a transform (open state) offsetParent skips up to the dropdown container, so offsetTop
   * already includes the motion.div's static y. Without this branch, non-Favorites sections
   * end up either under- or over-translated and the slide lands far from the header row. */
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
        <motion.div initial={false} animate={{ opacity: isOpen ? 0 : 1 }} transition={isOpen ? atStart : atEnd}>
          <SidebarSectionRow icon={section.icon} label={section.label} />
        </motion.div>
        {/*
         * Chevron timing:
         *   - Open: fades out concurrent with the rest of the dropdown.
         *   - Close (full or interrupted): hold through the close window, then fade back in
         *     over the next STAGE_DURATION on the now-static header row. On an interrupted
         *     close the chevron is mid-fade, but framer-motion freezes its current opacity
         *     during the delay so it doesn't compete with the reverse slide.
         */}
        <motion.div
          initial={false}
          animate={{ opacity: isOpen ? 0 : 1 }}
          transition={isOpen ? slide : { duration: STAGE_DURATION, delay: STAGE_DURATION, ease: EASE_OUT }}
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

      {/* Full-screen backdrop behind the dropdown. When clicked, it dismisses the dropdown. Fades concurrent with the open/close. */}
      <motion.div
        initial={false}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={slide}
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

      {/* Dropdown menu containing all sections in their original order. See animation schedule above for per-element timing. */}
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
        {/* Blur backdrop – sits behind the menu items, blurs only the content visible through this region. Fades concurrent with the open/close. */}
        <motion.div
          initial={false}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={slide}
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
              style={{ opacity: itemOpacities.current[s.id] }}
              animate={{
                y: isSelected ? (isOpen ? 0 : -selectedOffset) : 0,
              }}
              transition={slide}
            >
              <div
                ref={(el: HTMLDivElement | null) => {
                  itemEls.current[s.id] = el
                }}
                data-testid={`sidebar-${s.id}`}
                {...fastClick(() => {
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
 * Primary glow overlay behind the sidebar header. Renders a cropped region of a background
 * image and animates its size/position when the dropdown expands, giving a soft glow that
 * intensifies and shifts when the user opens the section picker. Hue-rotate / saturate
 * filters (driven by motion values from the parent) re-tint the glow per section.
 *
 * Spans 100vw so the glow bleeds beyond the sidebar's right edge on large devices.
 */
const SidebarOverlay1 = ({
  opacity,
  expanded,
  hue,
  sat,
}: {
  /** Shared motion value providing opacity derived from the sidebar's x position. */
  opacity: MotionValue<number>
  /** Whether the dropdown is currently expanded. */
  expanded: boolean
  /** Shared motion value driving CSS hue-rotate on the overlay. */
  hue: MotionValue<number>
  /** Shared motion value driving CSS saturate on the overlay. */
  sat: MotionValue<number>
}) => {
  const isLargeDevice = useBreakpoint('lg')

  /** Ramps from 0.8 (collapsed) to 1.0 (expanded), making the glow brighten when the dropdown
   * opens. Multiplied with the parent-supplied `opacity` for the final overlay opacity. */
  const dropdownOpacity = useMotionValue(0.8)
  useEffect(() => {
    animate(dropdownOpacity, expanded ? 1 : 0.8, { duration: durations.get('medium') / 1000, ease: EASE_OUT })
  }, [expanded, dropdownOpacity])

  const combinedOpacity = useTransform([opacity, dropdownOpacity], ([o, d]: number[]) => o * d)

  // Blurring the overlay image kills gradient banding in Safari (no perf cost, even on old
  // iPhones). Chromium still bands regardless, so the blur is gated to Safari only.
  const blur = BLUR_ENABLED ? 'blur(8px) ' : ''
  const filter = useTransform([hue, sat], ([h, s]) => `${blur}hue-rotate(${h}deg) saturate(${s})`)

  // Collapsed/expanded background styles. The background image is 1482×744; the multipliers
  // here scale it, and backgroundPositionY's negative offset crops the top so only the lower
  // glow region shows. Two expanded strategies because the sidebar's geometry differs by
  // breakpoint:
  //   - Large devices: fixed-width sidebar, so we keep the width narrow and only stretch height.
  //   - Small screens: full-width sidebar, so we scale both dimensions and offset x to fill it.
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
      transition={{
        duration: durations.get('slow') / 1000,
        ease: EASE_OUT,
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
 * Secondary glow overlay. Adds mid-tone color over the full sidebar height to layer with
 * SidebarOverlay1 — together they produce the per-section tinted glow. Unlike Overlay1,
 * this layer is static (no dropdown response, no blend mode) and uses a stronger blur.
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
  // See SidebarOverlay1 for why blur is Safari-only.
  const blur = BLUR_ENABLED ? 'blur(8px) ' : ''
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
 * Left-to-right gradient over the viewport edge. Sits next to ProgressiveBlur (see
 * SidebarBackground for why their stacking order is browser-specific) and provides a smooth
 * color transition from the sidebar into the main content. Also acts as a click-to-dismiss
 * target.
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
 * Full-screen layer behind the drawer. Stacks a dimming overlay, ProgressiveBlur, and
 * SidebarGradient — all driven by the sidebar's x position with a cubic ease-in so the
 * background fades in gently as the drawer slides and catches up as it settles.
 *
 * Blur and gradient are rendered in different orders per engine: in Safari the gradient
 * goes above the blur (otherwise patchy artifacts), in Chromium the blur goes above the
 * gradient (otherwise visible banding).
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
 * Top-level Sidebar component. Composes the background layers, glow overlays, drawer panel,
 * and section content. Handles open/close (Redux), swipe-to-close gestures, section
 * switching, Escape key, and body scroll lock.
 *
 * The drawer is always mounted (Radix forceMount, inherited from the previous MUI drawer)
 * and slides via a framer-motion x transform; swipe gestures are handled manually because
 * framer-motion's drag has no "wait and see" phase for direction detection.
 */
const Sidebar = () => {
  // ============================
  // State
  // ============================

  /** Whether the user is currently swiping the sidebar. When true, drag-and-drop
   * within Favorites is disabled to prevent conflicting gesture interactions. */
  const [isSwiping, setIsSwiping] = useState(false)

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

  const { hue, sat } = useSectionHue(sectionId)

  // The scroll area's CSS mask is composed from two independent motion values: dropdownMaskY
  // (the dim-out triggered by the dropdown) and scrollHintMaskY (the top-edge fade when the
  // user has scrolled). They get summed into a single mask-position-y. Splitting them in two
  // lets each one have its own animation timing without fighting for the same CSS slot.
  const dropdownMaskY = useMotionValue(dropdownOpen ? 0 : DROPDOWN_MASK_OFFSET)
  const scrollHintMaskY = useMotionValue(isScrolled ? 0 : SCROLL_HINT_MASK_OFFSET)
  // The scroll-hint contribution is weighted by how closed the dropdown is (0 when fully
  // open, full weight when fully closed) so the two effects compose smoothly during the
  // dropdown's close animation.
  const maskPositionY = useTransform<number, string>(
    [dropdownMaskY, scrollHintMaskY],
    ([d, s]) => `${d + (s * d) / DROPDOWN_MASK_OFFSET}px`,
  )
  // Opacity is derived from dropdownMaskY so the dim-out stays in lockstep with the slide.
  // 1 when fully closed (dropdownMaskY = DROPDOWN_MASK_OFFSET), 0.5 when fully open.
  const maskOpacity = useTransform(dropdownMaskY, v => 0.5 + (0.5 * v) / DROPDOWN_MASK_OFFSET)

  /** True while the dropdown close animation is running. Used to block the scroll-hint effect
   * from interrupting the close mask animation if isScrolled happens to flip during the close
   * (e.g. from a section swap triggering an onScroll via scrollTop clamp). */
  const dropdownCloseInProgress = useRef(false)

  useEffect(() => {
    if (dropdownOpen) {
      animate(dropdownMaskY, 0, { duration: STAGE_DURATION, ease: EASE_OUT })
      return
    }
    // Single-stage close: animate immediately. Framer interpolates smoothly from whatever
    // partial value dropdownMaskY currently holds, so an interrupted open unwinds in place.
    dropdownCloseInProgress.current = true
    animate(dropdownMaskY, DROPDOWN_MASK_OFFSET, { duration: STAGE_DURATION, ease: EASE_OUT })
    const clearId = setTimeout(() => {
      dropdownCloseInProgress.current = false
    }, STAGE_DURATION * 1000)
    return () => clearTimeout(clearId)
  }, [dropdownOpen, dropdownMaskY])

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

  /** Mirror longPressState into a ref so document-level touch handlers always see the current value without re-registering. */
  const longPressRef = useRef(longPressState)
  longPressRef.current = longPressState

  /** MUI-style uncertainty threshold for direction detection (in pixels). */
  const UNCERTAINTY_THRESHOLD = 3

  /** Per-touch swipe state for the manual touch handler. We don't use framer-motion's drag
   * because it has no "wait and see" phase to disambiguate horizontal swipe from vertical
   * scroll — this state machine, adapted from MUI's SwipeableDrawer, fills that gap. */
  const swipeState = useRef({
    /** Whether a touch is currently being tracked. */
    active: false,
    /** Null = direction not yet determined, true = horizontal swipe, false = vertical scroll. */
    isSwiping: null as boolean | null,
    /** True if the touch started outside the drawer (i.e. on the backdrop). */
    startedOnBackdrop: false,
    /** For backdrop-initiated swipes: true once the finger has crossed onto the drawer. */
    drawerHit: false,
    startX: 0,
    startY: 0,
    /** Last-move timestamp + position, used to compute a smoothed release velocity. */
    lastTime: 0,
    lastX: 0,
    velocity: 0,
  })

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

  /** Content opacity derived from x. Linear-maps x to [0,1] then squares it, so the content
   * stays readable while the sidebar is mostly open and fades rapidly as it approaches the
   * left edge. Applied to both the drawer content and the overlay layers. */
  const contentOpacity = useTransform(x, v => {
    const linear = Math.max(0, Math.min(1, (v + widthPx) / widthPx))
    return linear * linear
  })

  /** The open/close transition. Aggressive ease-out on open, gentler one on close so the
   * drawer doesn't appear to "jump" if the close kicks off from a swipe-release. */
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
              {/* The drawer panel. Slides horizontally via the x motion value; initial={false}
                  skips the enter animation on first mount so the sidebar doesn't animate in on
                  page load. style.x lets a manual swipe override the animated value mid-flight. */}
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
                {/* Tap-to-close strip on small screens. The full-width sidebar covers the whole
                    viewport, so users need an alternative to swipe; the right 10% acts as a
                    dismiss target. */}
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

                    {/* Scrollable content area; takes the remaining vertical space. The CSS mask
                        composed from maskPositionY + maskOpacity does double duty: it dims the
                        list when the dropdown opens, and adds a top fade when the user scrolls
                        down. overscrollBehavior:contain keeps overscroll local (body is already
                        scroll-locked); position:relative is required for the Favorites drop-
                        hover positioning. */}
                    <motion.div
                      data-scroll-at-edge
                      onScroll={e => setIsScrolled(e.currentTarget.scrollTop > 0)}
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
