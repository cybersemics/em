import { TOUCH_SLOP } from '../../constants'

/** How long the finger must rest before the ghost starts to charge, so a pause on the way to a release never shows any. */
export const GHOST_HOLD_GRACE_MS = 150

/** How long the ghost takes to charge fully once the finger is holding still. */
export const GHOST_CHARGE_MS = 1500

/** How long a full charge takes to drain while the finger moves. Twice as fast as it charges. */
export const GHOST_DRAIN_MS = GHOST_CHARGE_MS / 2

/**
 * The charge levels at which the ghost ticks a haptic as it rises, from 0 to 1. Charging at a steady rate, they fall
 * closer and closer together (about 270 ms apart at first and 50 ms at the end), so the ticks quicken like a ratchet
 * winding up to the discovery.
 */
export const GHOST_CHARGE_TICKS = [0.2, 0.38, 0.53, 0.66, 0.76, 0.84, 0.9, 0.95, 0.98]

/** The ghost's charge and what it needs to measure the finger's stillness from one frame to the next. */
export interface GhostCharge {
  /** How charged the ghost is, from 0 to 1. */
  charge: number
  /** Where the finger settled. It counts as still while it stays within TOUCH_SLOP of here. */
  anchor: { x: number; y: number } | null
  /** How long the finger has stayed within TOUCH_SLOP of the anchor, in ms. */
  stillFor: number
  /** How many of GHOST_CHARGE_TICKS the charge has reached. */
  ticks: number
}

/** The ghost before the finger has rested on it. */
export const initialGhostCharge: GhostCharge = { charge: 0, anchor: null, stillFor: 0, ticks: 0 }

/**
 * Advances the ghost's charge by one frame. The finger is still while it stays within TOUCH_SLOP of where it settled,
 * so the few pixels a resting finger always drifts do not count as moving. Once it has been still for
 * GHOST_HOLD_GRACE_MS the charge rises, filling in GHOST_CHARGE_MS; while the finger moves it drains twice as fast.
 * Without a finger (between gestures) nothing changes.
 */
const ghostCharge = (
  prev: GhostCharge,
  {
    point,
    dt,
  }: {
    /** Where the gesture's finger is now, or null if no gesture is in progress. */
    point: { x: number; y: number } | null
    /** How long the frame lasted, in ms. */
    dt: number
  },
): GhostCharge => {
  if (!point) return prev

  // The finger has strayed beyond the slop: it is moving, and settles again from here.
  const strayed = !prev.anchor || Math.hypot(point.x - prev.anchor.x, point.y - prev.anchor.y) > TOUCH_SLOP
  const anchor = strayed ? point : prev.anchor
  const stillFor = strayed ? 0 : prev.stillFor + dt

  // Rises once the finger has rested past the grace period, and drains otherwise.
  const rate = stillFor >= GHOST_HOLD_GRACE_MS ? 1 / GHOST_CHARGE_MS : -1 / GHOST_DRAIN_MS
  const charge = Math.min(Math.max(prev.charge + rate * dt, 0), 1)

  return { charge, anchor, stillFor, ticks: GHOST_CHARGE_TICKS.filter(tick => charge >= tick).length }
}

export default ghostCharge
