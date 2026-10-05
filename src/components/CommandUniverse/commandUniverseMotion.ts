import { Transition } from 'motion/react'
import durations from '../../util/durations'

/** Shared default for the Command Universe zoom. Motion durations are seconds. */
const commandUniverseMotion = {
  duration: durations.get('commandUniverseZoom') / 1000,
  // Tuned by eye. A low y1 keeps the opening from reading as a flicker; the long tail does the easing out.
  ease: [0.16, 0.46, 0.3, 1] as [number, number, number, number],
} satisfies Transition

export default commandUniverseMotion
