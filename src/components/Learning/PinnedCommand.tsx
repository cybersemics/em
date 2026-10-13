import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { commandById } from '../../commands'
import SettingsIcon from '../icons/SettingsIcon'
import PinnedCommandRing from './PinnedCommandRing'

/** Shows the selected command in a sticky corner slot alongside the NavBar. */
const PinnedCommand = () => {
  const pinnedCommandId = useSelector(state => state.learning.pinnedCommandId)
  const progressRecord = useSelector(state => (pinnedCommandId ? state.learning.progress[pinnedCommandId] : undefined))
  const reps = progressRecord?.reps ?? 0
  const targetReps = progressRecord?.targetReps ?? 0
  const progress = progressRecord ? Math.min(1, reps / targetReps) : 0
  // Counts the reps earned locally at or past the target for the current pin; each one plays the ring's flourish.
  // Progress loaded from storage or shown after repinning does not, so the counter is keyed to the pin.
  const [flourish, setFlourish] = useState(0)
  const previousReps = useRef({ pinnedCommandId, reps })
  // Each awarded rep plays the command's icon animation, as the toolbar does on activation. Like the toolbar, a
  // toggle command that has just been switched off does not animate.
  const [isIconAnimated, setIsIconAnimated] = useState(false)
  // Remounting the icon on each rep restarts the animation when a rep lands while the previous one is still playing.
  const [iconAnimationKey, setIconAnimationKey] = useState(0)
  const isCommandActive = useSelector(state => {
    const pinned = pinnedCommandId ? commandById(pinnedCommandId) : null
    return !pinned?.isActive || pinned.isActive(state)
  })

  useEffect(() => {
    const previous = previousReps.current
    previousReps.current = { pinnedCommandId, reps }
    if (previous.pinnedCommandId !== pinnedCommandId || reps <= previous.reps) return
    setIsIconAnimated(isCommandActive)
    setIconAnimationKey(key => key + 1)
    if (reps >= targetReps) setFlourish(count => count + 1)
  }, [pinnedCommandId, reps, targetReps, isCommandActive])

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
          <PinnedCommandRing key={pinnedCommandId} progress={progress} flourish={flourish}>
            <Icon
              size={14}
              fill={token('colors.gray50')}
              cssRaw={css.raw({ flex: 'none' })}
              key={iconAnimationKey}
              animated={isIconAnimated}
              animationComplete={() => setIsIconAnimated(false)}
            />
          </PinnedCommandRing>
        </div>
      </div>
    </div>
  )
}
export default PinnedCommand
