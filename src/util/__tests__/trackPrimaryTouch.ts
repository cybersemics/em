import trackPrimaryTouch from '../trackPrimaryTouch'

/** A touch event as trackPrimaryTouch reads it. `touches` defaults to `changedTouches`. */
const event = (
  type: string,
  changedTouches: { identifier: number; clientX: number; clientY: number; touchType?: string }[],
  touches = changedTouches,
) => ({ type, changedTouches, touches })

const finger = { identifier: 0, clientX: 10, clientY: 20 }
const second = { identifier: 1, clientX: 100, clientY: 200 }

/** Runs a sequence of touch events from no touch down and returns the marks they draw. */
const marksOf = (events: ReturnType<typeof event>[], primary: number | null = null) =>
  events.reduce<{ primary: number | null; marks: string[] }>(
    (acc, e) => {
      const { primary, mark } = trackPrimaryTouch(acc.primary, e)
      return { primary, marks: mark ? [...acc.marks, `${mark.kind} ${mark.x},${mark.y}`] : acc.marks }
    },
    { primary, marks: [] },
  ).marks

it('draws a dot where a touch starts and at each move, and a ring where it lifts', () => {
  expect(
    marksOf([
      event('touchstart', [finger]),
      event('touchmove', [{ ...finger, clientX: 30, clientY: 40 }]),
      event('touchmove', [{ ...finger, clientX: 50, clientY: 60 }]),
      event('touchend', [{ ...finger, clientX: 50, clientY: 60 }], []),
    ]),
  ).toEqual(['dot 10,20', 'dot 30,40', 'dot 50,60', 'ring 50,60'])
})

it('draws a ring where a touch is cancelled', () => {
  expect(marksOf([event('touchstart', [finger]), event('touchcancel', [finger], [])])).toEqual([
    'dot 10,20',
    'ring 10,20',
  ])
})

it('draws only the first finger of a multi-touch', () => {
  expect(
    marksOf([
      event('touchstart', [finger]),
      event('touchstart', [second], [finger, second]),
      event('touchmove', [{ ...second, clientX: 110 }], [finger, { ...second, clientX: 110 }]),
      event('touchend', [second], [finger]),
      event('touchend', [finger], []),
    ]),
  ).toEqual(['dot 10,20', 'ring 10,20'])
})

it('draws nothing for a stylus', () => {
  const pencil = { ...finger, touchType: 'stylus' }
  expect(
    marksOf([
      event('touchstart', [pencil]),
      event('touchmove', [{ ...pencil, clientX: 30 }]),
      event('touchend', [pencil], []),
    ]),
  ).toEqual([])
})

it('draws a finger that touches while a stylus is resting on the screen', () => {
  const pencil = { ...second, touchType: 'stylus' }
  expect(
    marksOf([
      event('touchstart', [pencil]),
      event('touchstart', [finger], [pencil, finger]),
      event('touchend', [finger], [pencil]),
    ]),
  ).toEqual(['dot 10,20', 'ring 10,20'])
})

// A touch whose target is removed mid-touch never reports its end to window, and Android reuses touch identifiers.
it('starts a new touch even when the previous one never reported its end', () => {
  expect(marksOf([event('touchstart', [finger]), event('touchend', [finger], [])], 0)).toEqual([
    'dot 10,20',
    'ring 10,20',
  ])
})
