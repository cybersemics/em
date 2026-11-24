import { GenieMotion } from './GenieFrame'
import { DAMPING, STIFFNESS } from './constants'
import genieMotion from './genieMotion'

/** How often the flight is sampled, in ms: one 60Hz frame. */
const STEP = 1000 / 60

/**
 * How fast the genie's head will be moving through a flight, sampled once per 60Hz frame, in px per second. The genie
 * starts at rest at the flight's first target and chases the target on its spring, exactly as GenieLoop flies it,
 * without the hover, which is too slow to count. Because the spring is solved exactly, this is the speed the genie
 * really flies at, however its frames fall, so a haptic made from it ahead of time stays in step with what is seen.
 */
const flightSpeeds = ({
  target,
  duration,
  spring,
}: {
  /** Where the genie is told to be, at a time in seconds from the start of the flight. */
  target: (time: number) => { x: number; y: number }
  /** How long the flight lasts, in seconds. */
  duration: number
  /** A spring to chase the target on at a time in seconds, instead of the genie's own, or null for its own. */
  spring?: (time: number) => { stiffness: number; damping: number } | null
}): { time: number; speed: number }[] => {
  const start = target(0)
  let motion: GenieMotion = { x: start.x, y: start.y, vx: 0, vy: 0, now: 0, samples: [] }
  const speeds = [{ time: 0, speed: 0 }]
  for (let now = STEP; now <= duration * 1000; now += STEP) {
    const time = now / 1000
    const override = spring?.(time)
    motion = {
      ...genieMotion(motion, {
        target: target(time),
        dt: STEP,
        memory: 0,
        stiffness: override?.stiffness ?? STIFFNESS,
        damping: override?.damping ?? DAMPING,
        bob: 0,
      }),
      samples: [],
    }
    speeds.push({ time, speed: Math.hypot(motion.vx, motion.vy) })
  }
  return speeds
}

export default flightSpeeds
