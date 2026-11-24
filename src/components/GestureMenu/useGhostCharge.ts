import { MotionValue, useAnimationFrame, useMotionValue } from 'motion/react'
import { useEffect, useRef } from 'react'
import gestureFingerStore from '../../stores/gestureFingerStore'
import haptics from '../../util/haptics'
import discoveryHaptics from '../Learning/discoveryHaptics'
import ghostCharge, { GHOST_CHARGE_TICKS, GhostCharge, initialGhostCharge } from './ghostCharge'

/** The longest frame the charge advances by at once, so a stalled frame (a background tab) cannot jump it to full. */
const MAX_FRAME_MS = 50

/**
 * The ghost's charge while the gesture matches it: how long the user has held their finger still on it, from 0 to 1.
 * It is a MotionValue advanced on Motion's frame loop rather than React state, so the fog's fill follows it without
 * rendering. Holding still charges it, moving drains it, and a haptic ratchet clicks at each of GHOST_CHARGE_TICKS on the
 * way up, tightening as it goes. When it is full it calls onCharged, once. It resets whenever the ghost stops being matched.
 *
 * The finger's position comes from gestureFingerStore, which MultiGesture writes for the gesture's own finger, rather
 * than from listening to touches here, so a second finger cannot hold or drain the charge.
 */
const useGhostCharge = ({
  active,
  onCharged,
}: {
  /** Whether the gesture matches the ghost. The charge runs only while it does. */
  active: boolean
  /** Called once, when the charge is full. */
  onCharged: () => void
}): MotionValue<number> => {
  const charge = useMotionValue(0)
  // The charge and the finger's stillness as of the last frame.
  const stateRef = useRef<GhostCharge>(initialGhostCharge)
  // Set once onCharged has been called, so it is called once per hold.
  const chargedRef = useRef(false)
  // The latest onCharged, called from the frame loop.
  const onChargedRef = useRef(onCharged)
  useEffect(() => {
    onChargedRef.current = onCharged
  }, [onCharged])

  // Start from empty each time the ghost is matched.
  useEffect(() => {
    stateRef.current = initialGhostCharge
    chargedRef.current = false
    charge.set(0)
  }, [active, charge])

  useAnimationFrame((_, delta) => {
    if (!active || chargedRef.current) return
    const next = ghostCharge(stateRef.current, {
      point: gestureFingerStore.getState().point,
      dt: Math.min(delta, MAX_FRAME_MS),
    })
    // Tick on the way up only, so draining is silent.
    if (next.ticks > stateRef.current.ticks) {
      haptics.pattern(discoveryHaptics.chargeTick(GHOST_CHARGE_TICKS[next.ticks - 1]))
    }
    stateRef.current = next
    charge.set(next.charge)
    if (next.charge >= 1) {
      chargedRef.current = true
      onChargedRef.current()
    }
  })

  return charge
}

export default useGhostCharge
