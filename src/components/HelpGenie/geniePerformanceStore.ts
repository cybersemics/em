import { motionValue } from 'motion/react'
import ministore, { registerReset } from '../../stores/ministore'

/** A point in viewport px. */
interface Point {
  x: number
  y: number
}

/**
 * A performance: the genie flying where the app tells it, frame by frame, instead of following the pointer. Command
 * Discovery uses one to fly the genie across a newly discovered command's name and into the pinned command ring.
 *
 * The performer writes the target every frame, from its own playhead, and the genie's frame loop (GenieLoop) chases it
 * on its spring. The genie writes back where its head is, so the performer can reveal things as the head actually
 * passes them rather than where it was told to be. A ministore that nothing subscribes to: the values change every
 * frame and only the two frame loops read them.
 */
const geniePerformanceStore = ministore({
  /**
   * Counts the performances started, so the genie can tell a new one has begun, and starts it at rest at its first
   * target instead of flying there from wherever it was.
   */
  id: 0,
  /** Where the genie flies to this frame, in viewport px. Null when there is no performance. */
  target: null as Point | null,
  /** A spring to chase the target on instead of the genie's own, for a landing that must not overshoot. */
  spring: null as { stiffness: number; damping: number } | null,
  /** Where the genie's head was on its last frame, in viewport px. Null until it draws a frame of this performance. */
  head: null as Point | null,
  /**
   * Whether the genie has been let out, invisible, only so that it is ready for a performance that may follow
   * (useGenieWarmup). A performer that finds it out for this reason puts it back afterwards, as if it had not been out.
   */
  warm: false,
})

/**
 * How visible the genie is, from 0 to 1. A performance fades the genie in where it begins and out where it ends;
 * otherwise it stays at 1. Outside Redux because it changes every frame.
 */
export const genieOpacity = motionValue(1)
registerReset(() => genieOpacity.set(1))

/** Begins a performance with the genie at rest at `at`. */
export const startPerformance = (at: Point) =>
  geniePerformanceStore.update(state => ({ id: state.id + 1, target: at, spring: null, head: null }))

/** Ends the performance, returning the genie to the pointer. */
export const endPerformance = () => geniePerformanceStore.update({ target: null, spring: null, head: null })

export default geniePerformanceStore
