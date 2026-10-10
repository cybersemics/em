/** A point the head passed through, and when it was there. */
export interface GenieSample {
  x: number
  y: number
  /** Milliseconds, on the frame's clock (GenieMotion.now). */
  time: number
}

/** Where the head is, how fast it is moving, and where it has been. Advanced each frame by genieMotion. */
export interface GenieMotion {
  x: number
  y: number
  /** Velocity, in px/s. */
  vx: number
  vy: number
  /** The frame's clock, in milliseconds since the genie started. */
  now: number
  /** Where the head has been within the last MEMORY ms, newest first, starting with where it is now. This is the trail. */
  samples: GenieSample[]
}

/**
 * One sparkle. Everything about it is fixed at birth, and its position and fade at any moment follow from its age, so
 * nothing about a sparkle changes from frame to frame.
 */
export interface Sparkle {
  /** Where on the path it was born. */
  x: number
  y: number
  /** Unit vector across the path where it was born, pointing to one side of the trail. */
  nx: number
  ny: number
  /** Where across the trail it sits: -1 at one edge, 0 in the middle, 1 at the other edge. */
  side: number
  /** When it was born and how long it lives, in milliseconds on the frame's clock. */
  born: number
  life: number
  /** Its size, in CSS pixels. */
  radius: number
  /** Where it starts in its twinkle, in radians. */
  phase: number
}

/**
 * Everything about the genie that changes from one frame to the next. The stepGenie function turns one frame into the
 * next, and the halo, trail, and sparkles are each drawn from it and keep no state of their own.
 */
interface GenieFrame {
  motion: GenieMotion
  /** The direction the head last moved in, as a unit vector. Kept while the head is still, so the halo does not spin. */
  heading: { x: number; y: number }
  /** Sparkles alive this frame, oldest first. */
  sparkles: Sparkle[]
}

export default GenieFrame
