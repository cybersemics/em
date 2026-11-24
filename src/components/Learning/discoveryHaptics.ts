import { Ahap } from '../../util/ahap'

/** A single tap of the given strength and crispness, from 0 to 1. */
const tap = (intensity: number, sharpness: number, time = 0) => ({
  Event: {
    Time: time,
    EventType: 'HapticTransient' as const,
    EventParameters: [
      { ParameterID: 'HapticIntensity' as const, ParameterValue: intensity },
      { ParameterID: 'HapticSharpness' as const, ParameterValue: sharpness },
    ],
  },
})

/** A buzz of the given strength and crispness that lasts `duration` seconds. */
const buzz = (intensity: number, sharpness: number, time: number, duration: number) => ({
  Event: {
    Time: time,
    EventType: 'HapticContinuous' as const,
    EventDuration: duration,
    EventParameters: [
      { ParameterID: 'HapticIntensity' as const, ParameterValue: intensity },
      { ParameterID: 'HapticSharpness' as const, ParameterValue: sharpness },
    ],
  },
})

/** Fades the intensity of everything playing from `time` to zero over `duration` seconds. */
const fadeOut = (time: number, duration: number) => ({
  ParameterCurve: {
    ParameterID: 'HapticIntensityControl' as const,
    Time: time,
    ParameterCurveControlPoints: [
      { Time: 0, ParameterValue: 1 },
      { Time: duration, ParameterValue: 0 },
    ],
  },
})

/** The most control points Core Haptics allows on one parameter curve. */
const MAX_CURVE_POINTS = 16

/**
 * Picks the few points of a curve that best keep its shape: starting from its two ends, repeatedly adds the point
 * furthest from the straight lines between the points already picked, until there are `count` of them.
 */
const keyPoints = <T extends { time: number; value: number }>(points: T[], count: number): T[] => {
  const picked = new Set([0, points.length - 1])
  while (picked.size < Math.min(count, points.length)) {
    const sorted = [...picked].sort((a, b) => a - b)
    let worst = { index: -1, error: -1 }
    sorted.slice(1).forEach((end, i) => {
      const a = points[sorted[i]]
      const b = points[end]
      for (let j = sorted[i] + 1; j < end; j++) {
        const expected = a.value + ((b.value - a.value) * (points[j].time - a.time)) / (b.time - a.time)
        const error = Math.abs(points[j].value - expected)
        if (error > worst.error) worst = { index: j, error }
      }
    })
    if (worst.index === -1) break
    picked.add(worst.index)
  }
  return [...picked].sort((a, b) => a - b).map(i => points[i])
}

/** How strong the flight's hum is at the genie's fastest. Quiet: it is felt more than noticed. */
const FLIGHT_INTENSITY = 0.22
/** How crisp the flight's hum is. Low, so it is a soft hum rather than a buzz. */
const FLIGHT_SHARPNESS = 0.08

/**
 * The haptics of discovering a command, in order. Together they make one score: a ratchet that tightens while the user
 * holds, a hit when the command is discovered, a soft thud as its fog settles, a quiet hum that follows the genie's
 * speed while it flies, a crisp tap as the genie reveals its name, and a double tap as the genie lands in the ring.
 */
const discoveryHaptics = {
  /**
   * One click of the ratchet while the ghost charges. `progress` is how far through the charge the click falls, from 0
   * to 1: each click is a little stronger and crisper than the last, so the hold tightens towards discovery.
   */
  chargeTick: (progress: number): Ahap => ({ Pattern: [tap(0.3 + 0.5 * progress, 0.35 + 0.5 * progress)] }),

  /** The command is discovered: a heavy hit, with a short rumble that dies away under it. */
  discovered: {
    Pattern: [tap(1, 0.7), buzz(0.6, 0.15, 0, 0.22), fadeOut(0, 0.22)],
  } satisfies Ahap,

  /** The fog settles where the name will be: a dull, soft thud. */
  fogLanded: { Pattern: [tap(0.45, 0.2)] } satisfies Ahap,

  /**
   * A quiet hum while the genie flies, which swells as it speeds up and fades as it slows, from the genie's speed
   * through the flight (flightSpeeds), in seconds from when the hum starts. The hum is one continuous event whose
   * strength follows a curve, since a playing pattern cannot be changed: the speed is known ahead of time, because
   * the genie's spring is exact.
   */
  flight: (speeds: { time: number; speed: number }[]): Ahap => {
    const fastest = Math.max(...speeds.map(sample => sample.speed))
    const duration = speeds[speeds.length - 1].time
    const points = keyPoints(
      speeds.map(({ time, speed }) => ({ time, value: fastest > 0 ? speed / fastest : 0 })),
      MAX_CURVE_POINTS,
    )
    return {
      Pattern: [
        buzz(FLIGHT_INTENSITY, FLIGHT_SHARPNESS, 0, duration),
        {
          ParameterCurve: {
            ParameterID: 'HapticIntensityControl' as const,
            Time: 0,
            ParameterCurveControlPoints: points.map(({ time, value }) => ({ Time: time, ParameterValue: value })),
          },
        },
      ],
    }
  },

  /** The genie has revealed the command's name: a crisp, medium tap. */
  nameRevealed: { Pattern: [tap(0.75, 0.6)] } satisfies Ahap,

  /** The genie lands in the ring: two rising taps, and a short tail that fades. */
  landed: {
    Pattern: [tap(0.55, 0.5), tap(0.9, 0.75, 0.09), buzz(0.35, 0.3, 0.09, 0.18), fadeOut(0.09, 0.18)],
  } satisfies Ahap,
}

export default discoveryHaptics
