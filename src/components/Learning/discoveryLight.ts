import { FRAME } from './discoveryDesign'
import { fogDescent } from './discoveryTimeline'

/** A lamp behind the screen, in the design's frame: where it is, how far behind the screen, and its color at its brightest. */
interface Lamp {
  x: number
  y: number
  /** How far behind the screen it is, in px. The further back, the broader and softer its light. */
  z: number
  /** Its color where it is brightest, straight in front of it, as red, green and blue from 0 to 255. */
  rgb: [number, number, number]
}

/**
 * Command Discovery's light, as lamps shining on the screen from behind it, so it behaves like real light. A lamp lights
 * a wall with a falloff that never reaches zero, (z² / (d² + z²))^1.5 at distance d from the point in front of it, so its
 * light has no edge to see, and when it moves the whole wall's light shifts with it rather than a shape travelling.
 *
 * The lamps are fitted by least squares to the light while the user holds and once it has poured, in the deeper colors
 * chosen over the design's: a key lamp that is lowered with the command from the top of the screen to just below where
 * its name comes to rest, a violet lamp to the upper left that comes up as it does, and a dim mauve lamp to the right
 * that dims a little. Positions and distances are in px of the design's 384×852 frame, which is stretched over the screen.
 */
const discoveryLight = {
  /** The lamp lowered with the command: from `yHold`, at the top of the screen, to `yPool`, just below the name. */
  key: { x: 140.7, z: 292, rgb: [68.8, 58.9, 69], yHold: 1.2, yPool: 436.9, holdStrength: 1.073 },
  /** Lamps that stay where they are while their strength changes, from `holdStrength` while the user holds to full. */
  fills: [
    { x: 38.1, y: 243.7, z: 220, rgb: [19, 14.8, 47.3], holdStrength: 0.119 },
    { x: 337.4, y: 266.1, z: 263.5, rgb: [7.2, 6, 11.9], holdStrength: 3 },
  ] satisfies (Lamp & { holdStrength: number })[],
}

/** Linear interpolation from a to b. */
const mix = (a: number, b: number, p: number) => a + (b - a) * p

/** The light a lamp casts on a point of the screen, in the design's frame, scaled by `strength`. */
const lampLight = (lamp: Lamp, x: number, y: number, strength: number) => {
  const d2 = (x - lamp.x) ** 2 + (y - lamp.y) ** 2
  const falloff = ((lamp.z * lamp.z) / (d2 + lamp.z * lamp.z)) ** 1.5 * strength
  return [lamp.rgb[0] * falloff, lamp.rgb[1] * falloff, lamp.rgb[2] * falloff]
}

/**
 * The lamps at a moment of the discovery, in seconds from it. The key lamp is lowered with the command, on the fog's own
 * descent, and every lamp's strength changes on the same curve, so the light moves exactly with the command.
 */
export const lampsAt = (time: number): (Lamp & { strength: number })[] => {
  const fall = fogDescent(time)
  const { key, fills } = discoveryLight
  return [
    {
      x: key.x,
      y: mix(key.yHold, key.yPool, fall),
      z: key.z,
      rgb: key.rgb as [number, number, number],
      strength: mix(key.holdStrength, 1, fall),
    },
    ...fills.map(fill => ({
      ...fill,
      rgb: fill.rgb as [number, number, number],
      strength: mix(fill.holdStrength, 1, fall),
    })),
  ]
}

/**
 * Draws the light at a moment into `pixels`, an RGBA image `width` by `height` that stands for the whole design frame.
 * The light is smooth enough to calculate at a few dozen points across and stretch over the screen. A little noise,
 * under one level, breaks up the banding that eight bits would otherwise draw across such a dark, gentle gradient.
 */
export const drawLight = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  time: number,
  random = Math.random,
) => {
  const lamps = lampsAt(time)
  for (let row = 0; row < height; row++) {
    const y = ((row + 0.5) / height) * FRAME.height
    for (let column = 0; column < width; column++) {
      const x = ((column + 0.5) / width) * FRAME.width
      let r = 0
      let g = 0
      let b = 0
      for (const lamp of lamps) {
        const [lr, lg, lb] = lampLight(lamp, x, y, lamp.strength)
        r += lr
        g += lg
        b += lb
      }
      const noise = random() - 0.5
      const i = (row * width + column) * 4
      pixels[i] = r + noise
      pixels[i + 1] = g + noise
      pixels[i + 2] = b + noise
      pixels[i + 3] = 255
    }
  }
}

export default discoveryLight
