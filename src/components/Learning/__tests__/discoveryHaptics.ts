import flightSpeeds from '../../HelpGenie/flightSpeeds'
import route from '../../HelpGenie/route'
import discoveryHaptics from '../discoveryHaptics'
import discoveryRoute from '../discoveryRoute'
import discoveryTimeline from '../discoveryTimeline'

/** The genie's speed along a discovery route on an iPhone-sized screen, from setting off. */
const speeds = () => {
  const path = route(
    discoveryRoute({
      title: { left: 72, right: 226, centerY: 326.6 },
      block: { left: 70, right: 290, top: 347, bottom: 426 },
      ring: { x: 356, y: 804 },
    }),
  )
  return flightSpeeds({
    target: time => path(discoveryTimeline.genieSetsOff + time),
    duration: discoveryTimeline.lands - discoveryTimeline.genieSetsOff,
    spring: () => ({ stiffness: 2500, damping: 1 }),
  })
}

/** When the genie hovers above the description in the design, in seconds from setting off. */
const HOVER = { start: 3.93 - discoveryTimeline.genieSetsOff, end: 4.43 - discoveryTimeline.genieSetsOff }

it('the flight hum is one quiet, soft continuous event as long as the flight', () => {
  const [hum] = discoveryHaptics.flight(speeds()).Pattern

  expect(hum).toMatchObject({ Event: { EventType: 'HapticContinuous', EventDuration: expect.closeTo(4.14, 1) } })
})

it('the flight hum follows the genie: silent at rest, full at its fastest, within Core Haptics’ 16 control points', () => {
  const samples = speeds()
  const [, curve] = discoveryHaptics.flight(samples).Pattern
  if (!('ParameterCurve' in curve)) throw new Error('Expected a curve')
  const points = curve.ParameterCurve.ParameterCurveControlPoints

  expect(points.length).toBeLessThanOrEqual(16)
  expect(points[0]).toEqual({ Time: 0, ParameterValue: 0 })
  expect(Math.max(...points.map(point => point.ParameterValue))).toBeCloseTo(1, 2)
  // The hover is the slowest stretch of the flight after it has set off.
  const hovering = points.filter(point => point.Time > HOVER.start + 0.1 && point.Time < HOVER.end - 0.1)
  hovering.forEach(point => expect(point.ParameterValue).toBeLessThan(0.3))
})
