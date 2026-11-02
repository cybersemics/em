import { GenieMotion } from './GenieFrame'

/**
 * Moves one axis of a damped spring forward by t seconds. `offset` is how far the head is from its target along this
 * axis and `velocity` how fast it is moving. `omega` sets how fast the spring pulls (the square root of STIFFNESS) and
 * `zeta` how quickly the swing dies out (DAMPING).
 *
 * This is the exact solution of the spring's equation rather than a step-by-step approximation, so the result does not
 * depend on how time is cut into frames: the genie flies the same path at 60Hz and 120Hz. The equation has three
 * forms, depending on whether the spring overshoots (zeta below 1), settles as fast as it can without overshooting
 * (zeta of 1), or settles slowly (zeta above 1). Returns the new offset and velocity.
 */
const springAxis = (
  offset: number,
  velocity: number,
  t: number,
  omega: number,
  zeta: number,
): [offset: number, velocity: number] => {
  if (zeta < 1) {
    // Overshoots: a swing (the sine and cosine) that dies away (the exponential). omegaD is how fast it swings.
    const omegaD = omega * Math.sqrt(1 - zeta * zeta)
    const decay = Math.exp(-zeta * omega * t)
    const cos = Math.cos(omegaD * t)
    const sin = Math.sin(omegaD * t)
    return [
      decay * (offset * cos + ((velocity + zeta * omega * offset) / omegaD) * sin),
      decay * (velocity * cos - ((zeta * omega * velocity + omega * omega * offset) / omegaD) * sin),
    ]
  }
  if (zeta === 1) {
    // Settles as fast as possible without overshooting.
    const decay = Math.exp(-omega * t)
    return [
      (offset + (velocity + omega * offset) * t) * decay,
      (velocity - omega * (velocity + omega * offset) * t) * decay,
    ]
  }
  // Settles slowly: the sum of two decays at different rates, r1 and r2.
  const root = Math.sqrt(zeta * zeta - 1)
  const r1 = -omega * (zeta - root)
  const r2 = -omega * (zeta + root)
  const c1 = (velocity - r2 * offset) / (r1 - r2)
  const c2 = offset - c1
  return [c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t), c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t)]
}

/**
 * Advances the head's motion by one frame: the head moves towards its target on a spring, and its new position is
 * added to the front of its remembered positions, dropping any older than `memory`. Those remembered positions are
 * the trail.
 */
const genieMotion = (
  motion: GenieMotion,
  {
    target,
    dt,
    memory,
    stiffness,
    damping,
    bob,
  }: {
    /** The point the head is moving towards. It is treated as fixed for the length of the frame. */
    target: { x: number; y: number }
    /** How long the frame lasted, in ms. */
    dt: number
    /** How long a position stays in the trail, in ms. */
    memory: number
    /** How strongly the head is pulled towards the target. */
    stiffness: number
    /** How quickly the head's swing dies out. Below 1 overshoots. */
    damping: number
    /** Radius of the gentle hover around the target, in px. 0 holds the head still. */
    bob: number
  },
): GenieMotion => {
  const now = motion.now + dt
  // The hover circles the target at two unrelated speeds, so it never settles into a visible loop.
  const tx = target.x + Math.cos((now / 1000) * 1.3) * bob * 0.7
  const ty = target.y + Math.sin((now / 1000) * 2.1) * bob
  const omega = Math.sqrt(stiffness)
  const [ox, vx] = springAxis(motion.x - tx, motion.vx, dt / 1000, omega, damping)
  const [oy, vy] = springAxis(motion.y - ty, motion.vy, dt / 1000, omega, damping)
  const x = tx + ox
  const y = ty + oy
  return {
    x,
    y,
    vx,
    vy,
    now,
    samples: [{ x, y, time: now }, ...motion.samples.filter(sample => now - sample.time <= memory)],
  }
}

export default genieMotion
