import { HapticParameter, PlayPatternOptions } from '@capawesome/capacitor-haptics'

/** One parameter of an AHAP event: how strong it is, or how crisp. Both run from 0 to 1. */
interface AhapEventParameter {
  ParameterID: 'HapticIntensity' | 'HapticSharpness'
  ParameterValue: number
}

/** A haptic event: a tap (transient) or a buzz that lasts EventDuration seconds (continuous). Time is in seconds. */
interface AhapEvent {
  Event: {
    Time: number
    EventType: 'HapticTransient' | 'HapticContinuous'
    EventDuration?: number
    EventParameters: AhapEventParameter[]
  }
}

/**
 * A curve that scales the intensity or sharpness of the events playing under it, between control points. Time and the
 * control points' times are in seconds, the control points' relative to the curve's.
 */
interface AhapParameterCurve {
  ParameterCurve: {
    ParameterID: 'HapticIntensityControl' | 'HapticSharpnessControl'
    Time: number
    ParameterCurveControlPoints: { Time: number; ParameterValue: number }[]
  }
}

/**
 * A haptic pattern in Apple's AHAP format (Apple Haptic and Audio Pattern), the format Core Haptics reads and Apple's
 * haptics tools write. Only the parts em uses are typed: haptic events, and curves over intensity and sharpness.
 */
export interface Ahap {
  Pattern: (AhapEvent | AhapParameterCurve)[]
}

/** Seconds to whole milliseconds. */
const ms = (seconds: number) => Math.round(seconds * 1000)

/**
 * Converts an AHAP pattern into the options @capawesome/capacitor-haptics plays. AHAP counts in seconds and the plugin
 * in milliseconds, and the plugin gives every control point a time from the start of the pattern rather than from the
 * start of its curve. An event without a sharpness is left for the platform to default.
 */
const ahapToPattern = (ahap: Ahap): PlayPatternOptions => {
  const events = ahap.Pattern.flatMap(entry => {
    if (!('Event' in entry)) return []
    const { Time, EventType, EventDuration, EventParameters } = entry.Event
    /** The value of one of the event's parameters, if it has it. */
    const parameter = (id: AhapEventParameter['ParameterID']) =>
      EventParameters.find(p => p.ParameterID === id)?.ParameterValue
    const sharpness = parameter('HapticSharpness')
    return [
      {
        time: ms(Time),
        intensity: parameter('HapticIntensity') ?? 1,
        ...(sharpness != null ? { sharpness } : null),
        ...(EventType === 'HapticContinuous' && EventDuration != null ? { duration: ms(EventDuration) } : null),
      },
    ]
  })
  const parameterCurves = ahap.Pattern.flatMap(entry => {
    if (!('ParameterCurve' in entry)) return []
    const { ParameterID, Time, ParameterCurveControlPoints } = entry.ParameterCurve
    return [
      {
        parameter: ParameterID === 'HapticIntensityControl' ? HapticParameter.Intensity : HapticParameter.Sharpness,
        controlPoints: ParameterCurveControlPoints.map(point => ({
          time: ms(Time + point.Time),
          value: point.ParameterValue,
        })),
      },
    ]
  })
  return parameterCurves.length > 0 ? { events, parameterCurves } : { events }
}

export default ahapToPattern
