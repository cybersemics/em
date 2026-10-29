import GenieFrame from './GenieFrame'
import { DAMPING, MEMORY, STIFFNESS } from './constants'
import genieMotion from './genieMotion'
import sparkles from './sparkles/sparkles'

/**
 * Advances the whole genie by one frame. This is the genie's only moving part: everything that changes lives in the
 * frame, and the halo, trail, and sparkles are drawn from it without keeping state of their own.
 *
 * 1. The head moves towards the target and remembers its new position (genieMotion). Those positions are the trail.
 * 2. The heading is updated, if the head is moving, so the halo knows which way is ahead.
 * 3. Sparkles are born along the stretch just flown, and old ones expire (sparkles).
 *
 * It is pure: the same frame and input always give the same next frame, so it can be tested and scripted.
 */
const stepGenie = (
  frame: GenieFrame,
  {
    target,
    dt,
    bob,
    random,
  }: {
    /** The point the head is moving towards: the pointer, or wherever moveHelpGenie sent it. */
    target: { x: number; y: number }
    /** How long the frame lasted, in ms. */
    dt: number
    /** Radius of the hover at rest, in px. 0 under reduced motion. */
    bob: number
    /** Random numbers from 0 to 1, for the sparkles. */
    random: () => number
  },
): GenieFrame => {
  const motion = genieMotion(frame.motion, { target, dt, memory: MEMORY, stiffness: STIFFNESS, damping: DAMPING, bob })
  const speed = Math.hypot(motion.vx, motion.vy)
  return {
    motion,
    // Below 1px/s the direction is noise from the hover, so the last real heading is kept.
    heading: speed > 1 ? { x: motion.vx / speed, y: motion.vy / speed } : frame.heading,
    sparkles: sparkles(frame.sparkles, { from: frame.motion, to: motion, now: motion.now, dt, random }),
  }
}

export default stepGenie
