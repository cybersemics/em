import trackTaps, { initialTapState } from '../trackTaps'

/** A touch event the primary touch made, as [type, x, y, time]. */
type Step = [type: string, x: number, y: number, time: number]

/** Runs a sequence of the primary touch's events from no touch down and returns the time of each double tap. */
const doubleTapsOf = (steps: Step[]) =>
  steps.reduce<{ state: typeof initialTapState; doubleTaps: number[] }>(
    (acc, [type, x, y, time]) => {
      const kind = type === 'touchstart' || type === 'touchmove' ? 'dot' : 'ring'
      const { state, doubleTap } = trackTaps(acc.state, type, { kind, x, y }, time)
      return { state, doubleTaps: doubleTap ? [...acc.doubleTaps, time] : acc.doubleTaps }
    },
    { state: initialTapState, doubleTaps: [] },
  ).doubleTaps

/** A tap at a point, starting at a time and lifting 50ms later. */
const tap = (x: number, y: number, time: number): Step[] => [
  ['touchstart', x, y, time],
  ['touchend', x, y, time + 50],
]

it('detects a double tap where the second tap lifts', () => {
  expect(doubleTapsOf([...tap(100, 100, 0), ...tap(102, 98, 200)])).toEqual([250])
})

it('does not detect a single tap', () => {
  expect(doubleTapsOf(tap(100, 100, 0))).toEqual([])
})

it('does not detect taps too far apart in time', () => {
  expect(doubleTapsOf([...tap(100, 100, 0), ...tap(100, 100, 500)])).toEqual([])
})

it('does not detect taps too far apart on screen', () => {
  expect(doubleTapsOf([...tap(100, 100, 0), ...tap(200, 100, 200)])).toEqual([])
})

it('does not count a touch that moved as a tap', () => {
  expect(
    doubleTapsOf([
      ...tap(100, 100, 0),
      ['touchstart', 100, 100, 200],
      ['touchmove', 130, 100, 220],
      ['touchend', 130, 100, 250],
    ]),
  ).toEqual([])
})

it('does not count a long press as a tap', () => {
  expect(doubleTapsOf([...tap(100, 100, 0), ['touchstart', 100, 100, 200], ['touchend', 100, 100, 800]])).toEqual([])
})

it('does not count a cancelled touch as a tap', () => {
  expect(doubleTapsOf([...tap(100, 100, 0), ['touchstart', 100, 100, 200], ['touchcancel', 100, 100, 250]])).toEqual([])
})

it('does not let the second tap of a double tap start another', () => {
  expect(doubleTapsOf([...tap(100, 100, 0), ...tap(100, 100, 200), ...tap(100, 100, 400)])).toEqual([250])
})
