import { MotionValue, useMotionTemplate, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react'
import { RefObject, useLayoutEffect, useState } from 'react'
import ringGeometry from './ringGeometry'

/** How much the ring grows while the tooltip is open. */
const EXPANDED_SCALE = 1.25

/**
 * The ring's expansion into the tooltip: as the tooltip opens, the ring grows and rises so its center lines up with the
 * tooltip's row of genie and text, so the ring reads as the end of that row. It also rises above the tooltip's
 * surface, so the surface's blur does not cover it. Every part follows the tooltip's opacity, so the ring expands and
 * settles back in step with the tooltip's fade.
 *
 * The rise is measured, not calculated. When the tooltip opens, and whenever the window resizes while it is open, this
 * reads where the docked ring and the row are on screen, and how far the expanded ring reaches in from the edge of the
 * screen, which the tooltip keeps its text clear of. Calculating it instead meant restating the tooltip's padding,
 * row height, and the safe-area inset in a CSS expression here, in step with the same numbers in the tooltip, and the
 * two files had to be kept in sync by hand. The measurement is one layout read when the tooltip opens; it does not run
 * while scrolling, typing, or animating. PopupBase measures itself once before paint for the same reason.
 *
 * It measures the ring's fixed dock, not the button inside it, because the dock does not move with the expansion: a
 * tooltip reopened mid-fade still reads where the ring rests.
 */
const useRingExpansion = ({
  isOpen,
  tooltipOpacity,
  dockRef,
  rowRef,
}: {
  /** Whether the tooltip is open. */
  isOpen: boolean
  /** The tooltip surface's opacity, from 0 (hidden) to 1 (open). */
  tooltipOpacity: MotionValue<number>
  /** The ring's fixed dock in the screen corner. */
  dockRef: RefObject<HTMLElement | null>
  /** The tooltip's row, which the ring lines up with. */
  rowRef: RefObject<HTMLElement | null>
}): {
  transform: MotionValue<string>
  isRaised: boolean
  ringFootprint: number
} => {
  // How far the fully expanded ring rises, in px, from its dock to the row's center. Negative is upward.
  const rise = useMotionValue(0)
  // How far the expanded ring reaches in from the right edge of the screen, in px.
  const [ringFootprint, setRingFootprint] = useState(0)

  useLayoutEffect(() => {
    if (!isOpen) return
    /** Reads where the docked ring and the row are, and aims the ring at the row. */
    const measure = () => {
      const dock = dockRef.current?.getBoundingClientRect()
      const row = rowRef.current?.getBoundingClientRect()
      if (!dock || !row) return
      // The ring scales from the dock's bottom-right corner, so its visible center and left edge move toward it.
      const expandedCenterY = dock.bottom - (dock.height - ringGeometry.visible.centerY) * EXPANDED_SCALE
      const expandedLeft = dock.right - (dock.width - ringGeometry.visible.left) * EXPANDED_SCALE
      rise.set(row.top + row.height / 2 - expandedCenterY)
      setRingFootprint(dock.right - expandedLeft)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isOpen, dockRef, rowRef, rise])

  const translateY = useTransform(
    [tooltipOpacity, rise],
    ([opacity, distance]) => (opacity as number) * (distance as number),
  )
  const scale = useTransform(tooltipOpacity, opacity => 1 + opacity * (EXPANDED_SCALE - 1))
  const transform = useMotionTemplate`translateY(${translateY}px) scale(${scale})`

  // Raised while the tooltip is visible at all, including through its fade-out.
  const [isRaised, setIsRaised] = useState(tooltipOpacity.get() > 0)
  useMotionValueEvent(tooltipOpacity, 'change', opacity => setIsRaised(opacity > 0))

  return { transform, isRaised, ringFootprint }
}

export default useRingExpansion
