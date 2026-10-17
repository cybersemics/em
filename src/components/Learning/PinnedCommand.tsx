import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { commandById } from '../../commands'
import PinnedCommandIcon from './PinnedCommandIcon'
import PinnedCommandRing from './PinnedCommandRing'

/** Shows the selected command in a sticky corner slot alongside the NavBar. */
const PinnedCommand = () => {
  const pinnedCommandId = useSelector(state => state.learning.pinnedCommandId)
  // The pinned command's practice record: how many reps the user has done and how many the ring is aiming for.
  const progressRecord = useSelector(state => (pinnedCommandId ? state.learning.progress[pinnedCommandId] : undefined))
  // Reps completed so far.
  const reps = progressRecord?.reps ?? 0
  // Reps needed to fill the ring, captured when the command was pinned.
  const targetReps = progressRecord?.targetReps ?? 0
  // Fraction of the ring to fill, from 0 to 1. Reps past the target keep the ring full.
  const progress = progressRecord ? Math.min(1, reps / targetReps) : 0
  // Notices each rep as it lands for the current pin, so the icon and the ring can celebrate it. `newReps` counts every
  // rep that lands and plays the icon's animation; `flourishes` counts those at or past the target and plays the ring's
  // flourish. Only a rise in the current pin's reps counts, so reps already saved when the widget mounts, or when a
  // command is pinned, never celebrate.
  const [newReps, setNewReps] = useState(0)
  const [flourishes, setFlourishes] = useState(0)
  const previousReps = useRef({ pinnedCommandId, reps })
  useEffect(() => {
    const previous = previousReps.current
    previousReps.current = { pinnedCommandId, reps }
    if (previous.pinnedCommandId !== pinnedCommandId || reps <= previous.reps) return
    setNewReps(count => count + 1)
    if (reps >= targetReps) setFlourishes(count => count + 1)
  }, [pinnedCommandId, reps, targetReps])

  const command = pinnedCommandId ? commandById(pinnedCommandId) : undefined
  if (!command) return null
  return (
    <div
      className={css({
        position: 'sticky',
        bottom: 'calc(max(11px, token(spacing.safeAreaBottom)))',
        height: 0,
        zIndex: 'pinnedCommand',
        pointerEvents: 'none',
      })}
    >
      <div className={css({ position: 'absolute', right: 0, bottom: '-22.5px' })}>
        <div
          data-testid='pinned-command'
          role='img'
          aria-label={`Pinned command: ${command.label}`}
          aria-description={
            progressRecord
              ? `Practice progress: ${Math.min(reps, targetReps)} of ${targetReps} repetitions`
              : 'Practice progress unavailable'
          }
        >
          <PinnedCommandRing key={pinnedCommandId} progress={progress} flourish={flourishes}>
            <PinnedCommandIcon command={command} repCount={newReps} />
          </PinnedCommandRing>
        </div>
      </div>
    </div>
  )
}
export default PinnedCommand
