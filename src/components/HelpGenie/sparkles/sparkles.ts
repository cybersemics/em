import { Sparkle } from '../GenieFrame'
import { MAX_SPARKLES, MEMORY, SPARKLE_DENSITY, SPARKLE_MIN_LIFE, SPARKLE_REST_RATE } from '../constants'

/**
 * Advances the sparkles by one frame: those past their lifetime are dropped, and new ones are born along the stretch
 * the head just flew, from `from` to `to`. The faster the head moves, the more are born; a head at rest still gives off
 * an occasional one. Sparkles never change after birth, so nothing else is updated.
 *
 * `random` returns a number from 0 to 1, as Math.random does. It is passed in so a scripted flight can use a seeded
 * sequence and always draw the same sparkles.
 */
const sparkles = (
  alive: Sparkle[],
  {
    from,
    to,
    now,
    dt,
    random,
  }: {
    /** Where the head was last frame. */
    from: { x: number; y: number }
    /** Where the head is now. */
    to: { x: number; y: number }
    /** The frame's clock, in ms. */
    now: number
    /** How long the frame lasted, in ms. */
    dt: number
    random: () => number
  },
): Sparkle[] => {
  const survivors = alive.filter(sparkle => now - sparkle.born < sparkle.life)

  const dx = to.x - from.x
  const dy = to.y - from.y
  const moved = Math.hypot(dx, dy)
  // How many sparkles this frame should produce on average. The whole part is always born; the fraction is born by
  // chance, so a rate below one a frame still averages out right over many frames.
  const expected = moved * SPARKLE_DENSITY + (dt / 1000) * SPARKLE_REST_RATE
  const count = Math.min(MAX_SPARKLES - survivors.length, Math.floor(expected) + (random() < expected % 1 ? 1 : 0))

  const newborn = Array.from({ length: Math.max(0, count) }, (): Sparkle => {
    // A random point along the stretch just flown.
    const along = random()
    // At rest there is no direction of travel, so a resting sparkle drifts out in a random direction instead.
    const angle = random() * Math.PI * 2
    return {
      x: from.x + dx * along,
      y: from.y + dy * along,
      nx: moved ? -dy / moved : Math.cos(angle),
      ny: moved ? dx / moved : Math.sin(angle),
      // Adding three random numbers bunches sparkles towards the middle of the trail, thinning towards its edges.
      side: Math.max(-1, Math.min(1, (random() + random() + random() - 1.5) / 1.2)),
      born: now,
      life: MEMORY * (SPARKLE_MIN_LIFE + random() * (1 - SPARKLE_MIN_LIFE)),
      // Mostly tiny, with the occasional larger one.
      radius: 0.3 + random() ** 4 * 1.7,
      phase: random() * Math.PI * 2,
    }
  })

  return [...survivors, ...newborn]
}

export default sparkles
