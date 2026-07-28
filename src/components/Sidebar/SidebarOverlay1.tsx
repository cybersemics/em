import { MotionValue, motion } from 'framer-motion'
import { css } from '../../../styled-system/css'
import { isAndroid, isSafari } from '../../browser'
import useBreakpoint from '../../hooks/useBreakpoint'
import safeY from '../../util/safeY'
import { EASE_OUT, SLOW_DURATION, cssEaseOut } from './sidebarConstants'
import { SECTIONS, SidebarSectionId, bakedOverlay } from './sidebarSections'

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

export default SidebarOverlay1
