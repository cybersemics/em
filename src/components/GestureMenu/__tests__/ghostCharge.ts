import ghostCharge, { GhostCharge, initialGhostCharge } from '../ghostCharge'

/** Advances the charge through frames of the given length, with the finger at each of the given points in turn. */
const run = (state: GhostCharge, points: { x: number; y: number }[], dt: number) =>
  points.reduce((charge, point) => ghostCharge(charge, { point, dt }), state)

/** A finger resting at one point for the given number of 10ms frames. */
const rest = (frames: number) => Array.from({ length: frames }, () => ({ x: 100, y: 200 }))

it('does not charge while the finger rests for less than 150ms', () => {
  const state = run(initialGhostCharge, rest(15), 10)

  expect(state.charge).toBe(0)
})

it('charges fully once the finger has rested for 150ms and then 1500ms more', () => {
  const almost = run(initialGhostCharge, rest(15 + 149), 10)
  const full = run(almost, rest(1), 10)

  expect(almost.charge).toBeLessThan(1)
  expect(full.charge).toBe(1)
})

it('a finger drifting within 10px of where it settled still counts as holding still', () => {
  const drifting = Array.from({ length: 15 + 150 }, (_, i) => ({ x: 100 + (i % 2) * 6, y: 200 + (i % 3) * 3 }))

  const state = run(initialGhostCharge, drifting, 10)

  expect(state.charge).toBe(1)
})

it('moving the finger drains the charge twice as fast as holding still fills it', () => {
  const half = run(initialGhostCharge, rest(15 + 75), 10)
  // A finger sweeping 20px every frame never settles.
  const moving = Array.from({ length: 10 }, (_, i) => ({ x: 120 + i * 20, y: 200 }))

  const drained = run(half, moving, 10)

  expect(half.charge).toBeCloseTo(0.5)
  expect(drained.charge).toBeCloseTo(0.5 - (10 * 10) / 750)
})

it('counts how many haptic ticks the charge has passed', () => {
  const quarter = run(initialGhostCharge, rest(15 + 38), 10)

  expect(quarter.charge).toBeCloseTo(0.253, 2)
  expect(quarter.ticks).toBe(1)
})

it('leaves the charge unchanged while no gesture is in progress', () => {
  const half = run(initialGhostCharge, rest(15 + 75), 10)

  const state = ghostCharge(half, { point: null, dt: 500 })

  expect(state).toBe(half)
})
