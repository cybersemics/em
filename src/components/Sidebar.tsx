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
 * 2. Section color tint. Triggered by changes in `sectionId`. Every section's pre-tinted layer
 * stays mounted (baked webp images / JS-pre-tinted gradients — see bakedOverlay and tintColor)
 * and the switch is a pure opacity crossfade over SLOW_DURATION; no filter ever animates or
 * exists at runtime (runtime hue/sat filters allocated fresh GPU buffers per frame).
 * 3. Sidebar dropdown. Triggered by `dropdownOpen`. Animates four values over STAGE_DURATION:
 * the opacity of dropdown item rows, the opacity of the chevron, the intensity of the sidebar headers' glow
 * (intensified when the dropdown is open), and a mask that dims the content of the sidebar underneath.
 * 4. Scroll-hint mask. Trigger: `isScrolled`. Slides the same static mask gradient (via the
 * `maskSlideY` transform pair — see COMPOSITED SLIDING MASK) to add a top-edge fade when the
 * list is scrolled.
 *
 */
import * as Dialog from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { MotionValue, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import _ from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { sidebarContentMaskRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { toggleSidebarActionCreator } from '../actions/toggleSidebar'
import { isAndroid, isSafari } from '../browser'
import { LongPressState } from '../constants'
import useBreakpoint from '../hooks/useBreakpoint'
import { DROPDOWN_MASK_BAND, SCROLL_HINT_FADE } from '../recipes/sidebarMaskGeometry'
import themeColors from '../selectors/themeColors'
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
import sectionTints from './sidebarSectionTints.json'

/** Default ease-out curve used for most sidebar animations. */
const EASE_OUT = [0.16, 0.6, 0.2, 1] as const

/** EASE_OUT as a CSS cubic-bezier, for compositor-driven CSS transitions. Derived so the framer
 * animations and the CSS transitions can never ease differently. */
const cssEaseOut = `cubic-bezier(${EASE_OUT.join(', ')})`

/** Softer ease-out used when *closing* the sidebar. The less aggressive start prevents the
 * drawer from appearing to "jump" when the user releases a swipe. */
const EASE_OUT_GENTLE = [0.25, 0.1, 0.25, 1] as const

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

/** Y offsets that slide the scrollable content's mask in and out — derived from the same
 * sidebarMaskGeometry constants that define the recipe's gradient stops, so the slide offsets and
 * the gradient shape cannot drift apart. These position the gradient relative to the scroll
 * area's top edge. */
const DROPDOWN_MASK_OFFSET = -DROPDOWN_MASK_BAND
const SCROLL_HINT_MASK_OFFSET = -SCROLL_HINT_FADE

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
 * The hue/saturate values live in sidebarSectionTints.json — shared with
 * scripts/gen-sidebar-overlays.py, which bakes the SAME values into the per-section webp overlays
 * (see bakedOverlay). A change to the JSON must be followed by re-running that script, or the
 * baked glow and the JS-tinted gradient (tintColor) will no longer match.
 */
const SECTIONS: SidebarSection[] = [
  { id: 'favorites', label: 'Favorites', icon: FavoritesIcon, ...sectionTints.favorites },
  { id: 'recentlyEdited', label: 'Recently Edited', icon: PencilIcon, ...sectionTints.recentlyEdited },
  { id: 'recentlyDeleted', label: 'Recently Deleted', icon: DeleteIcon, ...sectionTints.recentlyDeleted },
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

  /** Refs to each dropdown item's inner div, keyed by section id. Used by getSelectedOffset
   * below to measure where the selected row currently sits, which determines how far the
   * selected item must translate up to land on the header row. */
  const itemEls = useRef<Record<string, HTMLDivElement | null>>({})

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

  // Memoized: offsetTop reads force synchronous layout, and running them on EVERY render (many
  // per second mid-animation) stalls the main thread exactly when raster commits are racing the
  // frame deadline (measured as checkerboarded has_missing_content frames). Once per
  // toggle/section change is enough — the row geometry only changes with those.

  const selectedOffset = useMemo(getSelectedOffset, [getSelectedOffset, isOpen])

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
         * Invisible layout spacer. Reserves the header row's height and width so the chevron sits
         * after the title and the content below starts in the right place. The VISIBLE title is the
         * selected dropdown row (see the item render below), which is PERSISTENT — always opacity 1
         * — and slides into this spot. There is no longer a header/selected-item opacity swap, so
         * the title can never blank at the hand-off. `visibility: hidden` reserves space without
         * painting, and never toggles, so it costs nothing and can't gap.
         */}
        <div style={{ visibility: 'hidden' }} aria-hidden>
          <SidebarSectionRow icon={section.icon} label={section.label} />
        </div>
        {/*
         * Chevron timing (CSS transition; a compositor fade, no framer tick):
         *   - Open: fades out (1 → 0) concurrent with the rest of the dropdown.
         *   - Close: transition-delay holds it for one STAGE_DURATION, then it fades back in over
         *     the next STAGE_DURATION on the now-static header row — matching the old [0, 0, 1]
         *     keyframes for a completed open. One divergence from the keyframes: on an INTERRUPTED
         *     close (chevron still mid-fade-out), the transition holds the current mid-fade value
         *     through the delay instead of snapping to 0 — acceptably subtle here (≤ ~0.2 effective
         *     opacity for one stage, given the 0.4 base). Linear ease so the faint chevron reads as
         *     a fade, not a pop.
         */}
        <div
          // CSS crossfade (was framer keyframes). Open: fade out over one stage. Close: hold one
          // stage (transition-delay), then fade back in — see the timing note above.
          style={{
            opacity: isOpen ? 0 : 1,
            transition: `opacity ${STAGE_DURATION}s ${isOpen ? 'ease-out' : 'linear'} ${isOpen ? 0 : STAGE_DURATION}s`,
            willChange: isAndroid ? 'opacity' : undefined, // iOS: promotion feeds GPU-OOM, no benefit
          }}
          className={css({ display: 'inline-flex', paddingTop: '0.375rem' })}
        >
          <ChevronImg
            onClickHandle={() => setIsOpen(!isOpen)}
            additonalStyle={{
              opacity: 0.4,
            }}
          />
        </div>
      </div>

      {/* Full-screen backdrop behind the dropdown. When clicked, it dismisses the dropdown. CSS
          opacity fade (was a framer animate prop ticking per frame on the main thread). */}
      <div
        style={{ opacity: isOpen ? 1 : 0, transition: `opacity ${STAGE_DURATION}s ${cssEaseOut}` }}
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
        // Android: isolate the dropdown rows into their own small compositing layer — small
        // layers raster within the frame budget, and their invalidation can't blank innocent
        // neighbours squashed into a shared layer (the fast-toggle flicker).
        style={{ willChange: isAndroid ? 'transform' : undefined }}
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
            <div
              key={s.id}
              style={{
                // Every row keeps the SAME compositing setup regardless of which section is
                // selected: a constant willChange, an always-present transform, and one transition
                // covering both properties. Switching the selected section then changes ONLY
                // compositor values (transform / opacity) — it never flips willChange, creates a
                // transform layer, or re-renders the icon size, each of which re-rasters and blanks
                // the row for a frame (the fast-section-switch flicker). The selected row is the
                // persistent title (always opacity 1): it slides to the top to become the header
                // when closed, and is the list item when open. Non-selected rows fade in/out.
                opacity: isSelected ? 1 : isOpen ? 1 : 0,
                transform: `translateY(${isSelected && !isOpen ? -selectedOffset : 0}px)`,
                transition: `opacity ${STAGE_DURATION}s ${cssEaseOut}, transform ${STAGE_DURATION}s ${cssEaseOut}`,
                // Android only: the constant promotion is what prevents the fast-switch flicker on
                // Blink. On iOS/WebKit it instead grows the GPU process (promoted-layer buffers that
                // release lazily) — gate off; the transform/opacity transitions composite natively.
                willChange: isAndroid ? 'transform, opacity' : undefined,
              }}
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
                  // Pre-promote to its own compositor layer (Android/Blink only). Without this, the
                  // first touchdown starts the :hover/:active opacity transition, which makes Blink
                  // CREATE a layer on the spot — that creation blanks the row for one frame (the
                  // "flash out-in before the hover style applies"). iOS/WebKit has no creation-blank,
                  // and promoting instead feeds the GPU-process OOM, so gate to Android.
                  willChange: isAndroid ? 'opacity' : undefined,
                })}
              >
                {/* All section icons render at the same size (28, the header size) so nothing
                    resizes when the dropdown opens or the selection changes. */}
                <SidebarSectionRow icon={s.icon} label={s.label} iconSize={28} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Pre-baked per-section glow image (tint + 8px blur baked at build time by
 * scripts/gen-sidebar-overlays.py). IOS/WebKit uses these with NO runtime filter: even STATIC
 * filters allocate fresh GPU-process buffers on every (re)mount there — measured +676MB/6
 * section switches animating and +1262MB crossfading statically-filtered copies — which is the
 * exact growth jetsam kills the WebKit GPU process over. Plain image layers allocate nothing. */
const bakedOverlay = (layer: 1 | 2, sectionId: SidebarSectionId) =>
  `url(/img/sidebar/overlay-layer-${layer}-${sectionId}.webp)`

/** Applies the CSS hue-rotate + saturate color matrices (Filter Effects spec) to an rgb/rgba/hex
 * color in JS, so the iOS gradient can use pre-tinted colors instead of a runtime filter (see
 * bakedOverlay for why iOS must not filter at runtime). */
const tintColor = (color: string, sectionId: SidebarSectionId): string => {
  const section = SECTIONS.find(sec => sec.id === sectionId)!
  const rad = (section.hue * Math.PI) / 180
  const c = Math.cos(rad)
  const n = Math.sin(rad)
  const t = section.saturate
  const hue = [
    [0.213 + c * 0.787 - n * 0.213, 0.715 - c * 0.715 - n * 0.715, 0.072 - c * 0.072 + n * 0.928],
    [0.213 - c * 0.213 + n * 0.143, 0.715 + c * 0.285 + n * 0.14, 0.072 - c * 0.072 - n * 0.283],
    [0.213 - c * 0.213 - n * 0.787, 0.715 - c * 0.715 + n * 0.715, 0.072 + c * 0.928 + n * 0.072],
  ]
  const sat = [
    [0.213 + 0.787 * t, 0.715 - 0.715 * t, 0.072 - 0.072 * t],
    [0.213 - 0.213 * t, 0.715 + 0.285 * t, 0.072 - 0.072 * t],
    [0.213 - 0.213 * t, 0.715 - 0.715 * t, 0.072 + 0.928 * t],
  ]
  // Composed matrix: saturate ∘ hue-rotate (CSS applies filters left to right).
  const m = [0, 1, 2].map(i =>
    [0, 1, 2].map(j => sat[i][0] * hue[0][j] + sat[i][1] * hue[1][j] + sat[i][2] * hue[2][j]),
  )
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim())
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(color.trim())
  let r = 0
  let g = 0
  let b = 0
  let a = 1
  if (hex) {
    r = parseInt(hex[1].slice(0, 2), 16)
    g = parseInt(hex[1].slice(2, 4), 16)
    b = parseInt(hex[1].slice(4, 6), 16)
  } else if (rgba) {
    const parts = rgba[1].split(',').map(v => parseFloat(v))
    ;[r, g, b] = parts
    a = parts.length > 3 ? parts[3] : 1
  } else {
    return color // unknown format: leave untinted rather than crash
  }
  /** Clamps a color channel to the 0-255 byte range. */
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `rgba(${clamp(m[0][0] * r + m[0][1] * g + m[0][2] * b)}, ${clamp(m[1][0] * r + m[1][1] * g + m[1][2] * b)}, ${clamp(m[2][0] * r + m[2][1] * g + m[2][2] * b)}, ${a})`
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
  sectionId,
}: {
  /** Shared motion value providing opacity derived from the sidebar's x position. */
  opacity: MotionValue<number>
  /** Whether the dropdown is currently expanded. */
  expanded: boolean
  /** Active section — glow layers CSS-transition their opacity toward it (compositor-driven, so
   * the crossfade runs on the GPU thread instead of a per-frame framer tick on the main thread). */
  sectionId: SidebarSectionId
}) => {
  const isLargeDevice = useBreakpoint('lg')

  // WebKit (Safari/iOS): animate background-size/-position on a single full-viewport layer — the
  // pre-optimization path. The transform-scale approach below (a Chromium win, see the next comment)
  // is a WebKit disaster: WebKit re-rasterizes a filtered layer every frame while its transform
  // animates, AND sizes that layer's backing store to the SCALED, blurred bounds. So on iOS the
  // dropdown resize both repaints per frame (jank) and allocates a large transient blur buffer on
  // every open/close — which the WebContent process eventually OOM-kills on ("terminated … using too
  // much memory"). Background-size tweening repaints in place within a fixed-size layer, which WebKit
  // composites smoothly (this is the behaviour iOS shipped happily before the Android perf work).
  if (isSafari()) {
    const collapsed = {
      backgroundSize: 'calc(1482px * 0.425) calc(744px * 0.475)',
      backgroundPositionY: safeY(-84),
    }
    const open = isLargeDevice
      ? { backgroundSize: 'calc(1482px * 0.425) calc(744px * 0.825)', backgroundPositionY: safeY(-164) }
      : {
          backgroundSize: 'calc(1482px * 0.85) calc(744px * 0.85)',
          backgroundPositionY: safeY(-158),
          backgroundPositionX: '-320px',
        }
    // ALL sections' pre-baked images stay permanently mounted, each crossfading its own opacity
    // toward the active section. Inactive layers sit at opacity 0 — painted and resident, so a
    // switch is a pure compositor crossfade between two ready layers (no fresh-mount raster/pop).
    // The sidebar-position opacity lives on the wrapper, so no per-layer multiply is needed.
    return (
      <motion.div
        style={{ opacity }}
        className={css({ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 'sidebar' })}
      >
        {SECTIONS.map(sec => (
          <motion.div
            key={sec.id}
            style={{
              opacity: sec.id === sectionId ? 1 : 0,
              transition: `opacity ${SLOW_DURATION}s linear`,
              backgroundImage: bakedOverlay(1, sec.id),
              // NO will-change on iOS: promoting each full-viewport section layer to its own GPU
              // backing store grows the GPU process per switch (the jetsam-OOM path). The opacity
              // crossfade composites fine unpromoted here (measured: web-FPS unchanged, ~59).
            }}
            initial={collapsed}
            animate={expanded ? open : collapsed}
            transition={{ duration: SLOW_DURATION, ease: EASE_OUT }}
            className={css({
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100vh',
              width: '100vw',
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
        ))}
      </motion.div>
    )
  }

  // Chromium: the dropdown resize is a transform (scale + translate) on an inner layer, not an animated
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
  // CSS transform string for the resize (was a framer `animate` prop ticking on the main thread
  // every frame — the whole point is to run it on the compositor). transform + opacity are the
  // only animated properties; both composite.
  const t = expanded ? open : collapsed
  const resizeTransform = `translate(${t.x}px, ${t.y}px) scale(${t.scaleX}, ${t.scaleY})`

  return (
    // Outer: animates opacity only — a plain compositing layer, so the fade composites instead of
    // repainting. The filter lives on the inner (static value), so animating opacity here never
    // forces the filter to re-run.
    <motion.div
      // willChange (Android only): see the scroll-area mask note — same promotion rationale.
      style={{ opacity, willChange: isAndroid ? 'opacity' : undefined }}
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
      {/* Inner glow layer(s), sized/positioned to the collapsed crop. Each carries a STATIC
          hue/sat filter and the transform TOGETHER: the cached filtered buffer just composites
          (scales) — no per-frame repaint. ALL sections stay permanently mounted (opacity 0 when
          inactive): per-switch mount/unmount of full-viewport layers reshuffles Chromium's layer
          assignment and flickers unrelated overlapping elements (e.g. the hamburger). */}
      {SECTIONS.map(sec => (
        <div
          key={sec.id}
          // top must be an inline style, NOT css(): safeY() is a runtime function call, and Panda
          // extracts css() statically at build time — it can't evaluate the call, silently drops
          // the property, and the glow renders 84px too low (top: 0).
          style={{
            backgroundImage: bakedOverlay(1, sec.id),
            opacity: sec.id === sectionId ? 1 : 0,
            transform: resizeTransform,
            transition: `opacity ${SLOW_DURATION}s linear, transform ${SLOW_DURATION}s ${cssEaseOut}`,
            top: safeY(-84) /* collapsed backgroundPositionY */,
            // willChange (Android only): the promotion prevents the crossfade/resize repaint races
            // measured there; desktop Chromium doesn't need it and would pay 3 resident
            // full-viewport layers, and iOS never runs this branch (isSafari early return above).
            willChange: isAndroid ? 'opacity, transform' : undefined,
          }}
          className={css({
            position: 'absolute',
            left: '-150px', // collapsed backgroundPositionX (crops the image's left edge)
            width: 'calc(1482px * 0.425)', // collapsed backgroundSize width
            height: 'calc(744px * 0.475)', // collapsed backgroundSize height
            transformOrigin: 'top left', // scale grows from the crop's top-left, like background-size
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
          })}
        />
      ))}
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
  sectionId,
}: {
  /** CSS width of the overlay (either '100%' or '400px'). */
  width: string
  /** Opacity derived from the sidebar's x position. */
  opacity: MotionValue<number>
  /** Active section — glow layers CSS-transition their opacity toward it (compositor-driven, so
   * the crossfade runs on the GPU thread instead of a per-frame framer tick on the main thread). */
  sectionId: SidebarSectionId
}) => {
  /** Pre-baked per-section images on BOTH engines: zero runtime filters, and the half-res baked
   * assets quarter the compositing bandwidth of these resident layers — the glow stack's weight
   * was what made mask-snap rasters miss frame deadlines on Android (missing-content flicker). */
  const layers = SECTIONS.map(sec => ({
    key: sec.id,
    backgroundImage: bakedOverlay(2, sec.id),
    active: sec.id === sectionId,
  }))

  return (
    // Outer: animates opacity only (plain compositing layer). Inner holds the static filter + image
    // + mask, so the fade composites a cached buffer instead of re-running the filter every frame.
    <motion.div
      style={{ opacity, width, willChange: isAndroid ? 'opacity' : undefined }}
      className={css({
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 'sidebar',
      })}
    >
      {layers.map(({ key, active, ...styles }) => (
        <motion.div
          key={key}
          // willChange (Android only): without a runtime filter these layers lose their implicit
          // compositing trigger; unpromoted on Android the crossfade's per-frame opacity writes
          // REPAINT them (measured: dropped frames doubled). On iOS/WebKit the trade-off inverts —
          // promoting these full-viewport layers grows the GPU process toward jetsam-OOM, and the
          // fade composites smoothly without it (measured: web-FPS unchanged), so gate to Android.
          style={{
            ...styles,
            opacity: active ? 1 : 0,
            transition: `opacity ${SLOW_DURATION}s linear`,
            willChange: isAndroid ? 'opacity' : undefined,
          }}
          className={css({
            position: 'absolute',
            inset: 0,
            backgroundSize: '100% 800px',
            backgroundPosition: 'top left',
            backgroundRepeat: 'no-repeat',
            // on lg+ (landscape mobile and larger) screens, fade off the last 10% vertically to prevent a hard line at the bottom edge
            lg: {
              maskImage: 'linear-gradient(to right, black 95%, transparent 100%)',
            },
          })}
        />
      ))}
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
  sectionId,
}: {
  /** Opacity derived from the sidebar's x position. */
  opacity: MotionValue<number>
  /** CSS width of the gradient overlay. */
  width: string
  /** Whether the sidebar is currently open. */
  showSidebar: boolean
  /** Callback to open/close the sidebar. */
  toggleSidebar: (value: boolean) => void
  /** Active section — glow layers CSS-transition their opacity toward it (compositor-driven, so
   * the crossfade runs on the GPU thread instead of a per-frame framer tick on the main thread). */
  sectionId: SidebarSectionId
}) => {
  // Raw rgba/hex literals from the active theme — NOT Panda's token(): sidebarBg/bgTransparent are
  // semantic (theme-conditioned) tokens, so token() returns a 'var(--colors-…)' reference that
  // tintColor cannot parse (it would silently fall through and leave every section untinted).
  const colors = useSelector(themeColors)
  /** Gradient colors pre-tinted in JS on both engines — no runtime filter (see bakedOverlay).
   * Memoized: tintColor composes 3x3 color matrices, and the result only changes with the theme. */
  const layers = useMemo(
    () =>
      SECTIONS.map(sec => ({
        key: sec.id,
        background: `linear-gradient(to right, ${tintColor(colors.sidebarBg, sec.id)} 0%, ${tintColor(colors.bgTransparent, sec.id)} 100%)`,
      })),
    [colors],
  )

  return (
    // Outer: animates opacity only (plain compositing layer) and owns the click-to-dismiss target.
    // Inner holds the static gradient + hue/sat filter, so the fade composites a cached buffer
    // rather than re-running the filter every frame (which repaints this full-height layer).
    <motion.div
      aria-label='sidebar-gradient'
      aria-hidden='true'
      style={{ opacity, willChange: isAndroid ? 'opacity' : undefined }}
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
      {layers.map(({ key, ...styles }) => (
        <motion.div
          key={key}
          // willChange (Android only): see SidebarOverlay2's layer note — promote on Android to
          // avoid repaint jank, but NOT on iOS where the promotion drives the GPU-process OOM.
          style={{
            ...styles,
            opacity: key === sectionId ? 1 : 0,
            transition: `opacity ${SLOW_DURATION}s linear`,
            willChange: isAndroid ? 'opacity' : undefined,
          }}
          className={css({
            position: 'absolute',
            inset: 0,
          })}
        />
      ))}
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
  sectionId,
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
  /** Active section — glow layers CSS-transition their opacity toward it (compositor-driven, so
   * the crossfade runs on the GPU thread instead of a per-frame framer tick on the main thread). */
  sectionId: SidebarSectionId
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
            sectionId={sectionId}
          />
          <ProgressiveBlur
            direction='to right'
            minBlur={PROGRESSIVE_BLUR_MIN}
            maxBlur={32}
            layers={PROGRESSIVE_BLUR_LAYERS}
            width={width}
            opacity={opacity}
            promoteLayers={isAndroid}
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
            promoteLayers={isAndroid}
          />
          <SidebarGradient
            opacity={opacity}
            width={width}
            showSidebar={showSidebar}
            toggleSidebar={toggleSidebar}
            sectionId={sectionId}
          />
        </>
      )}
    </div>
  )
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

  // COMPOSITED SLIDING MASK. mask-position is not compositor-animatable in ANY engine (Blink
  // composites only transform/opacity/filter/backdrop-filter), so SLIDING the mask by position
  // re-rasterized the list every frame (~30fps on Pixel 6). SNAPPING it instead (tried next)
  // necessarily pops: any snap timing either leaks the list through the half-faded dropdown rows
  // (mid-transition) or blanks the just-selected section until the close animation ends (late).
  // Resolution: the gradient is STATIC (never repaints — see sidebarContentMaskRecipe) and the
  // slide is reproduced with a TRANSFORM PAIR: the mask-bearing wrapper translates by maskSlideY
  // while the scroller inside counter-translates by -maskSlideY, so the content and its scroll
  // clip stay pixel-stationary while the gradient glides across them — visually identical to the
  // original mask-position animation, but both transforms are CSS transitions that run on the
  // compositor, in lockstep with the row/dim fades (same duration + ease). This also covers the
  // scroll-hint fade, which was previously its own per-frame mask-position animation.
  // Gradient geometry (128px transparent band + 48px fade, oversized so every state is covered):
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
    // Both engines use the pre-baked per-section variants (see bakedOverlay) — warm them so the
    // first section switch crossfades without a fetch/decode hitch mid-animation.
    for (const section of SECTIONS) {
      preload(`/img/sidebar/overlay-layer-1-${section.id}.webp`)
      preload(`/img/sidebar/overlay-layer-2-${section.id}.webp`)
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
              sectionId={sectionId}
            />

            {/* Primary glow overlay – responds to dropdown expansion */}
            <SidebarOverlay1 opacity={contentOpacity} expanded={dropdownOpen} sectionId={sectionId} />
            {/* Secondary glow overlay – adds middle tones */}
            <SidebarOverlay2 width={width} opacity={contentOpacity} sectionId={sectionId} />

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

                    {/* Scroll area under the sliding mask (see the COMPOSITED SLIDING MASK note):
                        the outer div carries the STATIC mask gradient and translates by maskSlideY;
                        the scroller inside counter-translates so its content and scroll clip stay
                        pixel-stationary while the gradient glides over them. The dim is plain
                        opacity on the scroller itself. */}
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
                          transform: `translateY(${maskSlideY}px)`,
                          transition: `transform ${STAGE_DURATION}s ${cssEaseOut}`,
                          // This box rises up to 176px over the header/dropdown when revealed — it
                          // must not swallow their taps; the scroller re-enables its own events.
                          pointerEvents: 'none',
                          // Android: pre-promote so the transition doesn't create the layer
                          // mid-interaction (on-the-fly layer creation blanks content for a frame
                          // on Blink). iOS: no promotion (GPU-process memory, see overlay notes).
                          willChange: isAndroid ? 'transform' : undefined,
                        }}
                        className={cx(
                          css({ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }),
                          sidebarContentMaskRecipe(),
                        )}
                      >
                        <motion.div
                          data-scroll-at-edge
                          onScroll={e => setIsScrolled(e.currentTarget.scrollTop > 0)}
                          style={{
                            // Counter-slide: cancels the mask wrapper's translate so the list never
                            // visually moves; only the gradient does.
                            transform: `translateY(${-maskSlideY}px)`,
                            // Dim is a CSS opacity transition (compositor-driven), not a framer
                            // MotionValue ticked per frame on the main thread. 0.5 open / 1 closed.
                            opacity: dropdownOpen ? 0.5 : 1,
                            transition: `opacity ${STAGE_DURATION}s ${cssEaseOut}, transform ${STAGE_DURATION}s ${cssEaseOut}`,
                            pointerEvents: 'auto',
                            willChange: isAndroid ? 'opacity, transform' : undefined,
                          }}
                          className={css({
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
