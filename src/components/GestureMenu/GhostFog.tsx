import { MotionValue, motion } from 'motion/react'
import { css, cx } from '../../../styled-system/css'
import FOG_BLEED from './fogBleed'

/**
 * The ghost's two fogs: at rest, an even tinted fog; charged, a denser lavender one. Both are even across the whole
 * name, so the fog at rest never looks partly filled before the user has done anything.
 */
const ghostFog = {
  resting: css({ backgroundImage: 'linear-gradient(90deg, {colors.ghostFogStart}, {colors.ghostFogStart})' }),
  charged: css({ backgroundImage: 'linear-gradient(90deg, {colors.ghostExcitedStart}, {colors.ghostExcitedEnd})' }),
}

/** The text a fog is made of: the name, drawn in a gradient rather than a color, so blurring it leaves only fog. */
const fogText = css({ display: 'block', fontWeight: 400, backgroundClip: 'text', color: 'transparent' })

/** Room for a layer of fog's blur, without moving it. */
const bleed = { padding: FOG_BLEED, margin: -FOG_BLEED }

/**
 * An undiscovered command's name as fog: the name blurred until it cannot be read, with the charged fog over the
 * resting one. The Gesture Menu's ghost fills the charged fog as the user holds (`chargedOpacity` and `chargedMask`);
 * Command Discovery carries it fully charged down to where the name is revealed. Sized by the font size it inherits.
 */
const GhostFog = ({
  label,
  chargedOpacity = 1,
  chargedMask,
}: {
  label: string
  /** How thick the charged fog is, from 0 to 1. */
  chargedOpacity?: MotionValue<number> | number
  /** How much of the charged fog shows, as a CSS mask. All of it when omitted. */
  chargedMask?: MotionValue<string>
}) => (
  // Its own formatting context, so the layers' negative margins cannot collapse through it and shift one layer off the
  // other.
  <div
    aria-hidden
    className={css({ position: 'relative', display: 'flow-root', lineHeight: '1em', whiteSpace: 'nowrap' })}
  >
    <span className={cx(ghostFog.resting, fogText)} style={{ ...bleed, filter: 'blur(5.5px)', opacity: 0.6 }}>
      {label}
    </span>
    <motion.span
      className={cx(ghostFog.charged, fogText, css({ position: 'absolute' }))}
      style={{
        inset: -FOG_BLEED,
        padding: FOG_BLEED,
        filter: 'blur(4.5px)',
        opacity: chargedOpacity,
        maskImage: chargedMask,
        WebkitMaskImage: chargedMask,
      }}
    >
      {label}
    </motion.span>
  </div>
)

export default GhostFog
