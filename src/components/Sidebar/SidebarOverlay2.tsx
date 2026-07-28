import { MotionValue, motion } from 'framer-motion'
import { css } from '../../../styled-system/css'
import { isAndroid } from '../../browser'
import { SLOW_DURATION } from './sidebarConstants'
import { SECTIONS, SidebarSectionId, bakedOverlay } from './sidebarSections'

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

export default SidebarOverlay2
