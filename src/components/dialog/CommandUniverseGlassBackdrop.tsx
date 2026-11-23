import { MotionValue, motion } from 'motion/react'
import { useLayoutEffect, useState } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'
import useBackdropOpacity from './useBackdropOpacity'

/** The glass's layout box, published as custom properties so the scrim can be sized from the glass. */
const GLASS_PROPERTIES = [
  '--cu-glass-top',
  '--cu-glass-bottom',
  '--cu-glass-height',
  '--cu-glass-width',
  '--cu-glass-centre-x',
]

/** Publishes the glass's box on <html>, in viewport px, or clears it with null. */
const publishGlassBox = (box: Geometry | null) => {
  const root = document.documentElement.style
  if (!box) {
    GLASS_PROPERTIES.forEach(name => root.removeProperty(name))
    return
  }
  root.setProperty('--cu-glass-top', `${box.top}px`)
  root.setProperty('--cu-glass-bottom', `${box.top + box.height}px`)
  root.setProperty('--cu-glass-height', `${box.height}px`)
  root.setProperty('--cu-glass-width', `${box.width}px`)
  root.setProperty('--cu-glass-centre-x', `${box.left + box.width / 2}px`)
}

/** The glass's layout box in viewport px. */
interface Geometry {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Desktop blur of the app directly behind the Command Universe glass: a backdrop-filter the size and shape of the glass,
 * rendered in the dialog overlay before the scaling wrapper. Inside the wrapper Chrome limits a backdrop-filter's
 * backdrop to the wrapper's own contents, so the blur never reached the app. Around the glass the app is not blurred,
 * only dimmed by the scrim: a blur there had to be recomputed as the list scrolled, or split into pieces whose seams
 * showed at the glass's rounded corners.
 *
 * It does not scale with the glass during the open and close; it covers the glass's full size throughout and only
 * reaches slightly past the glass, as blur, while the glass is still faint. It also measures the glass and publishes
 * its box, which the scrim is sized and placed from.
 */
const CommandUniverseGlassBackdrop = ({
  positioner,
  animation,
}: {
  /**
   * The element that holds the glass, a child of the dialog wrapper. Passed as state rather than a ref: the wrapper
   * renders after this component, so its ref is not yet attached when this component's layout effect runs.
   */
  positioner: HTMLDivElement | null
  animation: { opacity: MotionValue<number>; scale: MotionValue<number> }
}) => {
  const dialog = dialogRecipe()
  const [geometry, setGeometry] = useState<Geometry | null>(null)
  const backdropOpacity = useBackdropOpacity(animation.opacity)

  useLayoutEffect(() => {
    if (!positioner) return

    /**
     * Reads the glass's layout box relative to the overlay. Offsets ignore transforms, so the open scale does not skew
     * it. The wrapper is read each time, since it has no offsetParent while the dialog is hidden.
     */
    const measure = () => {
      const wrapper = positioner.offsetParent
      if (!(wrapper instanceof HTMLElement)) {
        setGeometry(null)
        publishGlassBox(null)
        return
      }
      // The overlay is fixed at the viewport's origin, so these are viewport coordinates.
      const box = {
        left: wrapper.offsetLeft + positioner.offsetLeft,
        top: wrapper.offsetTop + positioner.offsetTop,
        width: positioner.offsetWidth,
        height: positioner.offsetHeight,
      }
      publishGlassBox(box)
      setGeometry(box)
    }

    measure()
    // Fires when the glass is shown or hidden as well as when it resizes.
    const observer = new ResizeObserver(measure)
    observer.observe(positioner)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      publishGlassBox(null)
    }
  }, [positioner])

  if (!geometry) return null

  const { left, top, width, height } = geometry
  return (
    <motion.div className={dialog.glassBackdropBlur} style={{ left, top, width, height, opacity: backdropOpacity }} />
  )
}

export default CommandUniverseGlassBackdrop
