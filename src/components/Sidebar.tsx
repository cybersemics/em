/**
 * The main sidebar component for the application. This sidebar slides in from
 * the left edge and provides access to Favorites, Recently Edited, and Recently Deleted.
 *
 * Overview:
 * - Uses Radix UI Dialog for accessibility (focus trapping, screen reader support)
 * - Uses Framer Motion for animations and gesture handling (see Animation model)
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
 *
 * Animation model:
 * Motion is driven by Framer Motion `MotionValue`s — numbers that update outside React's render
 * cycle, not React state.
 *
 * There are four independent animation systems:
 * 1. Drawer slide. Triggered by `showSidebar`. This animates `MotionValue` `x`. Manual swipes drive
 * the `x` value directly. The position and opacity of sidebar layers derive from `x`.
 * 2. Section color tint. Triggered by changes in `sectionId`. Animates `hue` and `sat` values over
 * SLOW_DURATION via the useSectionHue hook. Every glow or gradient layer derives its CSS filter
 * from them (useHueSatFilter).
 * 3. Sidebar dropdown. Triggered by `dropdownOpen`. Animates four values over STAGE_DURATION:
 * the opacity of dropdown item rows, the opacity of the chevron, the intensity of the sidebar headers' glow
 * (intensified when the dropdown is open), and a mask that dims the content of the sidebar underneath.
 * 4. Scroll-hint mask. Trigger: `isScrolled`. Animates `scrollHintMaskY` to add a top-edge fade
 * when the list is scrolled.
 *
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
import { isAndroid, isSafari } from '../browser'
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

/** Default ease-out curve used for most sidebar animations. */
const EASE_OUT = [0.16, 0.6, 0.2, 1] as const

/** Softer ease-out used when *closing* the sidebar. The less aggressive start prevents the
 * drawer from appearing to "jump" when the user releases a swipe. */
const EASE_OUT_GENTLE = [0.25, 0.1, 0.25, 1] as const

/** Backdrop-filter blur is too slow in Chromium to use freely, so we gate it to Safari. */
const BLUR_ENABLED = isSafari()

/** Number of stacked backdrop-filter layers in the sidebar's ProgressiveBlur. Each layer re-samples
 * the full backdrop every frame; Android's WebView flickers under the load (especially with the
 * Command Center also open), so it gets fewer. */
const PROGRESSIVE_BLUR_LAYERS = isAndroid ? 1 : 4

/** Minimum blur radius applied to every ProgressiveBlur layer. With fewer layers on Android the
 * trailing edge would otherwise drop to a hard 0px band; a small floor keeps the falloff smooth. */
const PROGRESSIVE_BLUR_MIN = isAndroid ? 4 : 0

/** Duration (seconds) of the dropdown open/close animation. */
const STAGE_DURATION = durations.get('medium') / 1000

/** Duration (seconds) of the slower sidebar animations: the section hue/sat shift and the
 * glow overlay's resize on dropdown expand. */
const SLOW_DURATION = durations.get('slow') / 1000

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
 */
const SidebarHeader = ({ sections, sectionId, onSectionChange, isOpen, setIsOpen }: SidebarHeaderProps) => {
  /** The currently active section. */
  const section = sections.find(s => s.id === sectionId)!

  // Transition presets for the dropdown's sliding open/close animations.
  const slide = { duration: STAGE_DURATION, ease: EASE_OUT, delay: 0 }

  /** Refs to each dropdown item's inner div, keyed by section id. Used by getSelectedOffset
   * below to measure where the selected row currently sits, which determines how far the
   * selected item must translate up to land on the header row. */
  const itemEls = useRef<Record<string, HTMLDivElement | null>>({})

  /** One motion value per section driving its dropdown-item opacity, driven imperatively. */
  const itemOpacities = useRef<Record<string, MotionValue<number>>>({})
  sections.forEach(s => {
    if (!itemOpacities.current[s.id]) {
      itemOpacities.current[s.id] = motionValue(0)
    }
  })

  /** Drives the static (closed-state) header row's opacity. It's the other half of the selected
   * dropdown item's swap, so it's kept as a motion value (rather than a declarative `animate`
   * prop) and snapped imperatively in the same layout effect as the item — see the swap handling
   * there for why same-tick scheduling matters. */
  const headerOpacity = useMotionValue(isOpen ? 0 : 1)

  // Drive each item's opacity based on the open state and which section is selected. Re-runs
  // when sectionId changes, which ensures section switches while the dropdown is mid-open
  // animate correctly.
  useLayoutEffect(() => {
    /* Animation cleanup functions – call all of these on unmount */
    const cancellers: (() => void)[] = []

    // Two kinds of rows. The selected section is drawn twice — as the header (when closed) and as
    // its row in the open list — so its row snaps in and out to hand off with the header. Every
    // other row just fades.
    for (const s of sections) {
      const opacity = itemOpacities.current[s.id]
      if (s.id === sectionId) {
        // Selected: snap visible now; on close, snap hidden again once the slide home finishes.
        opacity.set(1)
        if (!isOpen) {
          const controls = animate(opacity, 0, { duration: 0, delay: STAGE_DURATION })
          cancellers.push(() => controls.stop())
        }
      } else {
        // Others: fade toward open (1) or closed (0).
        const controls = animate(opacity, isOpen ? 1 : 0, { duration: STAGE_DURATION, ease: EASE_OUT })
        cancellers.push(() => controls.stop())
      }
    }

    // The static header is the other half of the selected item's swap, and both halves must flip
    // opacity on the SAME frame or the swap flickers: on open the header snaps to 0 the instant
    // the item takes over (delay 0); on close it snaps back to 1 exactly when the item snaps to 0
    // (delay STAGE_DURATION — identical to the item's snap above). Snapping it here, imperatively
    // in the same synchronous effect as the item, guarantees both land on one frame. A declarative
    // `animate` prop on the header is scheduled by a different mechanism and drifts a frame,
    // opening a one-frame gap where neither copy is visible — the flicker.
    const headerControls = animate(headerOpacity, isOpen ? 0 : 1, { duration: 0, delay: isOpen ? 0 : STAGE_DURATION })
    cancellers.push(() => headerControls.stop())

    return () => cancellers.forEach(c => c())
  }, [isOpen, sectionId, sections, headerOpacity])

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
         * Selected section row: instantly hidden when opening (the selected dropdown item takes
         * over), instantly shown after the close slide completes. Opacity is driven by the
         * headerOpacity motion value from the layout effect so its swap with the dropdown item is
         * frame-exact (see there).
         */}
        <motion.div style={{ opacity: headerOpacity }}>
          <SidebarSectionRow icon={section.icon} label={section.label} />
        </motion.div>
        {/*
         * Chevron timing (declarative; initial={false} skips the mount animation):
         *   - Open: fades out (1 → 0) concurrent with the rest of the dropdown.
         *   - Close: the [0, 0, 1] keyframes snap it to 0, hold through the close window, then fade
         *     it back in over the next STAGE_DURATION on the now-static header row. Keyframes always
         *     start from their first value (0), so an interrupted close (chevron still mid-fade-out)
         *     snaps cleanly to 0 rather than freezing mid-fade. Linear ease so the faint chevron
         *     reads as a fade, not a pop.
         */}
        <motion.div
          initial={false}
          animate={{ opacity: isOpen ? 0 : [0, 0, 1] }}
          transition={
            isOpen
              ? { duration: STAGE_DURATION, ease: EASE_OUT }
              : { duration: STAGE_DURATION * 2, times: [0, 0.5, 1], ease: 'linear' }
          }
          className={css({ display: 'inline-flex', paddingTop: '0.375rem' })}
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

      {/* Dropdown menu containing all sections in their original order. See the dropdown stage in the Animation model for per-element timing. */}
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

/** Builds a CSS `filter` string of hue-rotate + saturate from the shared hue/sat motion values,
 * as a MotionValue<string> for a motion.div's `filter` style. Deliberately scoped to just those
 * two filters: callers that also need blur (or any other filter) compose it onto the result
 * themselves, so this stays a reusable hue/sat helper rather than accreting every filter that
 * happens to pair with it. */
const useHueSatFilter = (hue: MotionValue<number>, sat: MotionValue<number>) =>
  useTransform([hue, sat], ([h, s]) => `hue-rotate(${h}deg) saturate(${s})`)

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
    animate(dropdownOpacity, expanded ? 1 : 0.8, { duration: STAGE_DURATION, ease: EASE_OUT })
  }, [expanded, dropdownOpacity])

  const combinedOpacity = useTransform([opacity, dropdownOpacity], ([o, d]: number[]) => o * d)

  // Blurring the overlay image kills gradient banding in Safari (no perf cost, even on old
  // iPhones). Chromium still bands regardless, so the blur is gated to Safari only.
  const blur = BLUR_ENABLED ? 'blur(8px) ' : ''
  const filter = useTransform(useHueSatFilter(hue, sat), f => `${blur}${f}`)

  // The dropdown resize is a transform (scale + translate) on an inner layer, not an animated
  // background-size/position on the outer one: transform is GPU-composited, whereas background-size
  // and background-position repaint the whole 100vw×100vh layer every frame. The inner layer is
  // sized and positioned to the COLLAPSED crop, so collapsed = the identity transform, and the open
  // state is reached by scaling from the top-left origin (equivalent to growing background-size from
  // the background-position corner) plus a translate for the position shift. This is faithful to the
  // old animation — size = base × scale, so a linear scale tween equals the old linear
  // background-size tween, and the safe-area term cancels in the translate deltas (safeY is linear).
  // The multipliers below mirror the original background-size fractions of the 1482×744 image:
  //   - Large devices: width fixed (scaleX 1), height 0.475→0.825; positionY -84→-164.
  //   - Small screens: both dims 0.425/0.475→0.85; positionX -150→-320, positionY -84→-158.
  const collapsed = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
  const open = isLargeDevice
    ? { x: 0, y: -164 - -84, scaleX: 1, scaleY: 0.825 / 0.475 }
    : { x: -320 - -150, y: -158 - -84, scaleX: 0.85 / 0.425, scaleY: 0.85 / 0.475 }

  return (
    // Outer: animates opacity only — a plain compositing layer, so the fade composites instead of
    // repainting. The filter lives on the inner (static value), so animating opacity here never
    // forces the filter to re-run.
    <motion.div
      style={{ opacity: combinedOpacity }}
      className={css({
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100vh',
        width: '100vw',
        overflow: 'hidden', // crop the scaled inner layer (the background bounds did this before)
        pointerEvents: 'none',
        zIndex: 'sidebar',
        // fade out the bottom edge of the overlay on portrait mobile for a smoother transition to the background
        lgDown: {
          maskImage: 'linear-gradient(to top, transparent 200px, black 80%)',
        },
      })}
    >
      {/* Inner glow layer, sized/positioned to the collapsed crop. Carries the hue/sat filter and
          the transform TOGETHER: the filter value is static during the slide/dropdown, so its
          buffer is cached and the transform just composites (scales) it — no per-frame repaint.
          (The filter only re-renders on a section change, when hue/sat actually animate.) */}
      <motion.div
        initial={collapsed}
        animate={expanded ? open : collapsed}
        transition={{ duration: SLOW_DURATION, ease: EASE_OUT }}
        style={{ filter }}
        className={css({
          position: 'absolute',
          top: safeY(-84), // collapsed backgroundPositionY
          left: '-150px', // collapsed backgroundPositionX (crops the image's left edge)
          width: 'calc(1482px * 0.425)', // collapsed backgroundSize width
          height: 'calc(744px * 0.475)', // collapsed backgroundSize height
          transformOrigin: 'top left', // scale grows from the crop's top-left, like background-size
          backgroundImage: 'url(/img/sidebar/overlay-layer-1.avif)',
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        })}
      />
    </motion.div>
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
  const filter = useTransform(useHueSatFilter(hue, sat), f => `${blur}${f}`)

  return (
    // Outer: animates opacity only (plain compositing layer). Inner holds the static filter + image
    // + mask, so the fade composites a cached buffer instead of re-running the filter every frame.
    <motion.div
      style={{ opacity, width }}
      className={css({
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 'sidebar',
      })}
    >
      <motion.div
        style={{ filter }}
        className={css({
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/img/sidebar/overlay-layer-2.avif)',
          backgroundSize: '100% 800px',
          backgroundPosition: 'top left',
          backgroundRepeat: 'no-repeat',
          // on lg+ (landscape mobile and larger) screens, fade off the last 10% vertically to prevent a hard line at the bottom edge
          lg: {
            maskImage: 'linear-gradient(to right, black 95%, transparent 100%)',
          },
        })}
      />
    </motion.div>
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
  const filter = useHueSatFilter(hue, sat)

  return (
    // Outer: animates opacity only (plain compositing layer) and owns the click-to-dismiss target.
    // Inner holds the static gradient + hue/sat filter, so the fade composites a cached buffer
    // rather than re-running the filter every frame (which repaints this full-height layer).
    <motion.div
      aria-label='sidebar-gradient'
      aria-hidden='true'
      style={{ opacity }}
      onClick={() => toggleSidebar(false)}
      className={css({
        position: 'absolute',
        inset: 0,
        width,
        pointerEvents: showSidebar ? 'auto' : 'none',
        cursor: 'pointer',
        userSelect: 'none',
      })}
    >
      <motion.div
        style={{ filter }}
        className={css({
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, {colors.sidebarBg} 0%, {colors.bgTransparent} 100%)',
        })}
      />
    </motion.div>
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
       * Blur/gradient stacking order is engine-specific:
       *   - WebKit (Safari/iOS): blur -above- the gradient; the reverse produces patchy artifacts.
       *   - Chromium: blur -below- the gradient; the reverse produces visible banding.
       * backdrop-filter is expensive on Chromium (each layer recomposites the full backdrop every
       * frame during the slide), so Android uses fewer layers — see PROGRESSIVE_BLUR_LAYERS.
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
          <ProgressiveBlur
            direction='to right'
            minBlur={PROGRESSIVE_BLUR_MIN}
            maxBlur={32}
            layers={PROGRESSIVE_BLUR_LAYERS}
            width={width}
            opacity={opacity}
          />
        </>
      ) : (
        <>
          <ProgressiveBlur
            direction='to right'
            minBlur={PROGRESSIVE_BLUR_MIN}
            maxBlur={32}
            layers={PROGRESSIVE_BLUR_LAYERS}
            width={width}
            opacity={opacity}
          />
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
    const t = { duration: SLOW_DURATION, ease: 'linear' as const }
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
 * The drawer subtree mounts only while open (and during the close slide-out; see drawerMounted)
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

  /** Self-managed mount for the sidebar subtree, replacing Radix's forceMount. It mounts on open
   * and stays mounted through the close slide-out (torn down in the drawer's onAnimationComplete,
   * with a fallback in an effect below for closes where no slide-out runs), so the enter/exit
   * animations still play while a fully-closed sidebar costs zero compositing. The parent Sidebar
   * component and its motion values persist across this; only the subtree's own state (list scroll
   * position, Favorites UI state) resets on close, which is acceptable here. */
  const [drawerMounted, setDrawerMounted] = useState(showSidebar)

  const { hue, sat } = useSectionHue(sectionId)

  // Two motion values feed the scroll area's CSS mask (see the scroll mask in the Animation
  // model): dropdownMaskY dims the list when the dropdown opens; scrollHintMaskY fades the top
  // edge when scrolled. Kept separate so each can animate on its own timing.
  //
  // NOTE: animating mask-position is paint-bound (not compositor-accelerated), so the list
  // repaints during the ~300ms dropdown animation. A composited alternative was tried — static
  // mask on an oversized carrier translated by y, with the scroll container counter-translated —
  // but it is structurally broken on Chromium: transforming an actively-scrolled element cancels
  // the in-progress touch-scroll gesture, and the paired carrier/scroller transforms desync under
  // load (the scroller is independently compositor-promoted), flashing the list by the full mask
  // offset. Keep the mask-position animation.
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
    // Yield while the dropdown owns the mask — open or mid-close (see the scroll mask coupling).
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

  // Sync drawerMounted with showSidebar. Mounting is immediate; unmounting normally happens in
  // the drawer's onAnimationComplete so the close slide-out can play first. But if the drawer is
  // already fully off-screen when the close arrives — a swipe carried it exactly to the edge, or
  // the sidebar was toggled closed before the open animation began — framer has nothing to
  // animate and never fires onAnimationComplete, which would leave a zombie sidebar mounted
  // forever. Unmount directly in that case.
  useEffect(() => {
    if (showSidebar) {
      setDrawerMounted(true)
    } else if (x.get() === -widthPx) {
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

  /** The open/close transition. Aggressive ease-out on open, gentler one on close so the
   * drawer doesn't appear to "jump" if the close kicks off from a swipe-release. */
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
      <Dialog.Root open={showSidebar || drawerMounted} onOpenChange={toggleSidebar} modal={false}>
        {/*
         * No forceMount: the sidebar subtree mounts on open and unmounts once the close slide-out
         * finishes (see drawerMounted + the drawer's onAnimationComplete), so a fully-closed sidebar
         * costs zero compositing. Keeping Dialog `open` true while drawerMounted is still set lets
         * the exit animation play before Radix tears the portal down.
         */}
        <Dialog.Portal>
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
              {/* The drawer panel. Slides horizontally via the x motion value. It now mounts
                  off-screen (initial x = -widthPx) and animates in, since the subtree is no longer
                  force-mounted; on close it animates back off-screen, then onAnimationComplete
                  unmounts the subtree (see drawerMounted). style.x lets a manual swipe override the
                  animated value mid-flight. */}
              <motion.div
                ref={drawerRef}
                style={{ x, opacity: contentOpacity }}
                initial={{ x: -widthPx }}
                animate={{ x: showSidebar ? 0 : -widthPx }}
                transition={transition}
                onAnimationComplete={() => {
                  if (!showSidebar) setDrawerMounted(false)
                }}
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
