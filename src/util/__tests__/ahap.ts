import { HapticParameter } from '@capawesome/capacitor-haptics'
import ahapToPattern from '../ahap'

it('converts taps and buzzes from seconds to milliseconds', () => {
  const pattern = ahapToPattern({
    Pattern: [
      {
        Event: {
          Time: 0.09,
          EventType: 'HapticTransient',
          EventParameters: [
            { ParameterID: 'HapticIntensity', ParameterValue: 0.9 },
            { ParameterID: 'HapticSharpness', ParameterValue: 0.75 },
          ],
        },
      },
      {
        Event: {
          Time: 0.1,
          EventType: 'HapticContinuous',
          EventDuration: 0.18,
          EventParameters: [{ ParameterID: 'HapticIntensity', ParameterValue: 0.35 }],
        },
      },
    ],
  })

  expect(pattern).toEqual({
    events: [
      { time: 90, intensity: 0.9, sharpness: 0.75 },
      { time: 100, intensity: 0.35, duration: 180 },
    ],
  })
})

it('times each control point of a curve from the start of the pattern, not of its curve', () => {
  const pattern = ahapToPattern({
    Pattern: [
      {
        ParameterCurve: {
          ParameterID: 'HapticIntensityControl',
          Time: 0.09,
          ParameterCurveControlPoints: [
            { Time: 0, ParameterValue: 1 },
            { Time: 0.18, ParameterValue: 0 },
          ],
        },
      },
    ],
  })

  expect(pattern.parameterCurves).toEqual([
    {
      parameter: HapticParameter.Intensity,
      controlPoints: [
        { time: 90, value: 1 },
        { time: 270, value: 0 },
      ],
    },
  ])
})
