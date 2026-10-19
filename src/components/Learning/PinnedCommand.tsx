import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { commandById } from '../../commands'
import SettingsIcon from '../icons/SettingsIcon'
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
  const command = pinnedCommandId ? commandById(pinnedCommandId) : undefined
  if (!command) return null
  const Icon = command.svg ?? SettingsIcon
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
          <PinnedCommandRing key={pinnedCommandId} progress={progress}>
            <Icon size={14} fill={token('colors.gray50')} className={css({ flex: 'none' })} />
          </PinnedCommandRing>
        </div>
      </div>
    </div>
  )
}
export default PinnedCommand
