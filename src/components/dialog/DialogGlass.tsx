import { MotionValue, motion } from 'motion/react'
import { PropsWithChildren } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'

/** Presents the clipped glass surface separately from decorations that extend outside it. */
const DialogGlass = ({ children, opacity }: PropsWithChildren<{ opacity?: MotionValue<number> }>) => {
  const dialog = dialogRecipe()
  return (
    <motion.div className={dialog.glassSheet} data-cu-glass-sheet='true' style={{ opacity }}>
      {/* Muted-purple radial fill concentrated near the top of the glass. */}
      <div className={dialog.containerBackground} />
      {/* Rounded clip region containing the highlights "trapped" inside the glass. */}
      <div className={dialog.glassClipWrapper}>
        {/* Light highlight trapped inside the glass. */}
        <div className={dialog.highlightClipped} />
        {/* Rainbow refraction trapped inside the glass. */}
        <div className={dialog.rainbowClipped} />
      </div>
      {/* Luminance mask that fades the glass stroke off toward the bottom. */}
      <div className={dialog.glassStrokeMask}>
        {/* Gradient border simulating light refracting through the glass edge. */}
        <div className={dialog.glassStrokeBorder} />
      </div>
      {/* Dialog content (title + body). */}
      <div className={dialog.contentLayer}>{children}</div>
    </motion.div>
  )
}

export default DialogGlass
