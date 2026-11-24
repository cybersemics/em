import { cubicBezier } from 'motion/react'
import sampleCurve from '../../util/sampleCurve'
import { DESCENT_CURVE, GENIE_PATH } from './discoveryDesign'

/**
 * Command Discovery's timeline: when each part of the screen moves, in seconds from the moment the command is
 * discovered, and how. Everything on the screen is placed on one playhead that runs from 0 to `end`, so the parts stay
 * in step however the frames fall. The times and easings are the design's, read out of EffectCraft (see
 * discoveryDesign); the easings are its keyframes' influences, written as cubic Béziers.
 */
const discoveryTimeline = {
  /** The charged fog falls from where it was in the Gesture Menu to where the name will be. */
  fogDescends: { start: 0, end: 0.833 },
  /** Once down, the fog thins a little and softens, ready for the genie. */
  fogSettles: { start: 0.833, end: 1.533 },
  /** The command's gesture appears as the fog lands, and the name it will reveal settles to its size. */
  titleSettles: { start: 0.833, end: 1.3, ease: cubicBezier(0.1, 0, 0.15, 1) },
  /** The genie sets off along its route, from off the left of the screen. */
  genieSetsOff: GENIE_PATH[0][0],
  /** It fades in as it comes. */
  genieAppears: { start: 0.967, end: 1.133 },
  /** The description and note develop as the genie orbits them. */
  description: { start: 2.55, end: 3.883 },
  /** Done rises in while the genie hovers. */
  done: { start: 3.867, end: 4.267, ease: cubicBezier(0.75, 0, 0.67, 1) },
  /** The ring, and the hint beside it, appear as the genie dips towards them. */
  ring: { start: 4.817, end: 5.267, ease: cubicBezier(0.1, 0, 0.2, 1) },
  /** A genie that was only let out for the discovery fades into the ring. */
  genieLeaves: { start: 4.983, end: 5.333 },
  /** The genie settles in the ring. */
  lands: 5.067,
  /** A ripple leaves the ring as the genie lands: it brightens quickly, then fades as it spreads. */
  ripple: { start: 5.067, peak: 5.15, end: 5.817, ease: cubicBezier(0.1, 0, 0.2, 1) },
  /** The playhead stops. */
  end: 5.9,
}

export default discoveryTimeline

/** How far down the fog has fallen at a moment, in seconds from the discovery, from 0 to 1. */
export const fogDescent = (time: number) => {
  const { start, end } = discoveryTimeline.fogDescends
  return sampleCurve(DESCENT_CURVE, Math.min(1, Math.max(0, (time - start) / (end - start))))[1]
}
