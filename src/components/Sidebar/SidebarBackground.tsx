import { MotionValue, motion, useTransform } from 'framer-motion'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { isAndroid, isSafari } from '../../browser'
import themeColors from '../../selectors/themeColors'
import tintColor from '../../util/tintColor'
import ProgressiveBlur from '../ProgressiveBlur'
import { SLOW_DURATION } from './constants'
import { SECTIONS, SidebarSectionId } from './sidebarSections'

/** Android uses one blur layer to avoid WebView compositing flicker. */
const PROGRESSIVE_BLUR_LAYERS = isAndroid ? 1 : 4

/** Preserve a smooth trailing edge when Android uses one blur layer. */
const PROGRESSIVE_BLUR_MIN = isAndroid ? 4 : 0

/**
 * A colored gradient band as wide as the drawer, anchored to the left edge of the screen,
 * behind the drawer: solid sidebar-tinted color at the left, fading to fully transparent at
 * its own right edge — right where the drawer meets the rest of the app — so the sidebar's
 * color bleeds into the content instead of cutting off with a hard line.
 *
 * Sits next to ProgressiveBlur (see SidebarBackground below for why their stacking order is
 * browser-specific). Also acts as a click-to-dismiss target.
 */
const SidebarGradient = ({
  opacity,
  widthAsCssString,
  showSidebar,
  toggleSidebar,
  sectionId,
}: {
  /** Opacity derived from the sidebar's x position. */
  opacity: MotionValue<number>
  /** CSS width of the gradient overlay. */
  widthAsCssString: string
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
      SECTIONS.map(sidebarSection => ({
        key: sidebarSection.id,
        background: `linear-gradient(to right, ${tintColor(colors.sidebarBg, sidebarSection.hue, sidebarSection.saturate)} 0%, ${tintColor(colors.bgTransparent, sidebarSection.hue, sidebarSection.saturate)} 100%)`,
      })),
    [colors],
  )

  return (
    <motion.div
      aria-label='sidebar-gradient'
      aria-hidden='true'
      // width is inline for the same reason as the drawer panel: Panda cannot statically extract
      // SIDEBAR_WIDTH_PX across modules, so in css() it emits no rule and inset:0 stretches this
      // layer across the whole viewport instead of the sidebar.
      style={{ opacity, width: widthAsCssString, willChange: isAndroid ? 'opacity' : undefined }}
      onClick={() => toggleSidebar(false)}
      className={css({
        position: 'absolute',
        inset: 0,
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
 * The layer of visual effects behind the drawer, covering the full screen. Composes three
 * pieces, back to front: a dimming overlay across the whole screen, then ProgressiveBlur and
 * SidebarGradient — both confined to a band as wide as the drawer, anchored to its left edge —
 * layered together to blur and color-tint the app content right behind where the drawer sits.
 * All three fade in together, driven by the sidebar's x position, with a cubic ease-in so the
 * background catches up gently as the drawer settles into place.
 *
 * Blur and gradient swap stacking order per engine: in Safari the gradient renders above the
 * blur (otherwise patchy artifacts); in Chromium the blur goes above the gradient (otherwise
 * visible banding).
 */
const SidebarBackground = ({
  x,
  width,
  showSidebar,
  toggleSidebar,
  widthAsCssString,
  sectionId,
}: {
  /** The sidebar's current x-axis translation motion value. */
  x: MotionValue<number>
  /** Sidebar width in pixels, used to derive opacity from x position. */
  width: number
  /** Whether the sidebar is currently open. */
  showSidebar: boolean
  /** Callback to open/close the sidebar. */
  toggleSidebar: (value: boolean) => void
  /** CSS width string for child overlay components. */
  widthAsCssString: string
  /** Active section. */
  sectionId: SidebarSectionId
}) => {
  // Derive opacity from sidebar x position, then apply cubic ease-in
  // so the background fades in gently and catches up as the sidebar settles.
  const linearOpacity = useTransform(x, [-width, 0], [0, 1])
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
            widthAsCssString={widthAsCssString}
            showSidebar={showSidebar}
            toggleSidebar={toggleSidebar}
            sectionId={sectionId}
          />
          <ProgressiveBlur
            direction='to right'
            minBlur={PROGRESSIVE_BLUR_MIN}
            maxBlur={32}
            layers={PROGRESSIVE_BLUR_LAYERS}
            width={widthAsCssString}
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
            width={widthAsCssString}
            opacity={opacity}
            promoteLayers={isAndroid}
          />
          <SidebarGradient
            opacity={opacity}
            widthAsCssString={widthAsCssString}
            showSidebar={showSidebar}
            toggleSidebar={toggleSidebar}
            sectionId={sectionId}
          />
        </>
      )}
    </div>
  )
}

export default SidebarBackground
