import { Transition } from 'motion/react'
import durations from '../../util/durations'

/** Shared default for production motion and the optional development controls. Motion durations are seconds. */
const commandUniverseMotion = {
  duration: durations.get('commandUniverseZoom') / 1000,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
} satisfies Transition

export default commandUniverseMotion
