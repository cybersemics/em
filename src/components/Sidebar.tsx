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
import { DROPDOWN_MASK_BAND, MASK_OVERSIZE, SCROLL_HINT_FADE } from '../recipes/sidebarMaskGeometry'
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

/** CSS equivalent of EASE_OUT. */
const cssEaseOut = `cubic-bezier(${EASE_OUT.join(', ')})`

/** Softer ease-out used when *closing* the sidebar. The less aggressive start prevents the
 * drawer from appearing to "jump" when the user releases a swipe. */
const EASE_OUT_GENTLE = [0.25, 0.1, 0.25, 1] as const

/** Android uses one blur layer to avoid WebView compositing flicker. */
const PROGRESSIVE_BLUR_LAYERS = isAndroid ? 1 : 4

/** Preserve a smooth trailing edge when Android uses one blur layer. */
const PROGRESSIVE_BLUR_MIN = isAndroid ? 4 : 0

/** Duration (seconds) of the dropdown open/close animation. */
const STAGE_DURATION = durations.get('medium') / 1000

/** Duration (seconds) of the slower sidebar animations: the section hue/sat shift and the
 * glow overlay's resize on dropdown expand. */
const SLOW_DURATION = durations.get('slow') / 1000

/** Position the shared mask geometry relative to the scroll area's top edge. */
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
 * The hue/saturate values in sidebarSectionTints.json are shared by the runtime gradient and the
 * locally generated AVIF overlays. Regenerate the images after changing these values.
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

  /** Distance the selected row must move to become the closed header. A transformed wrapper can
   * become offsetParent, so include its offset only when offsetTop does not already contain it. */
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

  // Measure only when the dropdown or section changes; offsetTop forces layout.
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
        {/* Reserve space for the selected dropdown row, which slides here when closed. */}
        <div style={{ visibility: 'hidden' }} aria-hidden>
          <SidebarSectionRow icon={section.icon} label={section.label} />
        </div>
        {/* Fade out on open; wait for the selected row to settle before fading back in. */}
        <div
          style={{
            opacity: isOpen ? 0 : 1,
            transition: `opacity ${STAGE_DURATION}s ${isOpen ? 'ease-out' : 'linear'} ${isOpen ? 0 : STAGE_DURATION}s`,
            willChange: isAndroid ? 'opacity' : undefined, // Android: avoid opacity-transition flicker.
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

      {/* Dismiss the dropdown when the area behind it is clicked. */}
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

      {/* Dropdown sections in display order. */}
      <div
        // Android: isolate the dropdown rows to avoid compositing flicker.
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
                // The selected row stays visible and slides into the header; other rows fade.
                opacity: isSelected ? 1 : isOpen ? 1 : 0,
                transform: `translateY(${isSelected && !isOpen ? -selectedOffset : 0}px)`,
                transition: `opacity ${STAGE_DURATION}s ${cssEaseOut}, transform ${STAGE_DURATION}s ${cssEaseOut}`,
                // Android: keep each row promoted to avoid fast-switch flicker.
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
                  // Android: promote before the active-state fade to avoid a one-frame blank.
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

/** Pre-baked section tint and blur; avoids runtime filters that leak WebKit GPU buffers. */
const bakedOverlay = (layer: 1 | 2, sectionId: SidebarSectionId) =>
  `url(/img/sidebar/overlay-layer-${layer}-${sectionId}.avif)`

/** Applies CSS hue-rotate and saturation matrices to a color without a runtime filter. */
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
 * Primary glow overlay behind the sidebar header. It resizes when the section dropdown opens.
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
  /** Active section. */
  sectionId: SidebarSectionId
}) => {
  const isLargeDevice = useBreakpoint('lg')

  // WebKit resizes a fixed layer; scaling it creates oversized backing stores and can exhaust memory.
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
    // Keep every tint mounted so section changes are opacity-only crossfades.
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

  // Chromium transforms the collapsed crop because animating background geometry repaints each frame.
  const collapsed = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
  const open = isLargeDevice
    ? { x: 0, y: -164 - -84, scaleX: 1, scaleY: 0.825 / 0.475 }
    : { x: -320 - -150, y: -158 - -84, scaleX: 0.85 / 0.425, scaleY: 0.85 / 0.475 }
  const t = expanded ? open : collapsed
  const resizeTransform = `translate(${t.x}px, ${t.y}px) scale(${t.scaleX}, ${t.scaleY})`

  return (
    <motion.div
      // Android: promote the fade to avoid repaint flicker.
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
      {/* Keep every tinted crop mounted so section changes only crossfade opacity. */}
      {SECTIONS.map(sec => (
        <div
          key={sec.id}
          // Panda cannot extract runtime safeY(), so top must remain inline.
          style={{
            backgroundImage: bakedOverlay(1, sec.id),
            opacity: sec.id === sectionId ? 1 : 0,
            transform: resizeTransform,
            transition: `opacity ${SLOW_DURATION}s linear, transform ${SLOW_DURATION}s ${cssEaseOut}`,
            top: safeY(-84) /* collapsed backgroundPositionY */,
            // Android: promote the crossfade and resize to avoid repaint flicker.
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
  /** Active section. */
  sectionId: SidebarSectionId
}) => {
  /** Pre-baked section tints avoid runtime filters. */
  const layers = SECTIONS.map(sec => ({
    key: sec.id,
    backgroundImage: bakedOverlay(2, sec.id),
    active: sec.id === sectionId,
  }))

  return (
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
          // Android: promote the crossfade to avoid repaint flicker.
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
  /** Active section. */
  sectionId: SidebarSectionId
}) => {
  // tintColor needs resolved theme colors rather than Panda's CSS variable references.
  const colors = useSelector(themeColors)
  /** Pre-tinted gradient colors, recomputed only when the theme changes. */
  const layers = useMemo(
    () =>
      SECTIONS.map(sec => ({
        key: sec.id,
        background: `linear-gradient(to right, ${tintColor(colors.sidebarBg, sec.id)} 0%, ${tintColor(colors.bgTransparent, sec.id)} 100%)`,
      })),
    [colors],
  )

  return (
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
          // Android: promote the crossfade to avoid repaint flicker.
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
  /** Active section. */
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

      {/* WebKit needs blur above the gradient; Chromium needs it below. */}
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
 * The drawer remains mounted through its close animation. Swipe gestures are handled manually
 * because framer-motion's drag has no "wait and see" phase for direction detection.
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

      // Prevent backdrop touches before Android begins its overscroll bounce.
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
              {/* Unmount the drawer after its close animation. */}
              <motion.div
                ref={drawerRef}
                style={{ x, opacity: contentOpacity }}
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
                  width,
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
