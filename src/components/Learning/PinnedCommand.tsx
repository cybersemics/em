import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { commandById } from '../../commands'
import SettingsIcon from '../icons/SettingsIcon'
import PinnedCommandRing from './PinnedCommandRing'

/**
 * The persistent bottom-right widget showing the pinned command's icon inside its practice ring. Renders nothing when
 * no command is pinned. It is display-only in this version: pointer events pass through to the content beneath so
 * gestures and taps in the corner behave as before.
 */
const PinnedCommand = () => {
  const pinnedCommandId = useSelector(state => state.learning.pinnedCommandId)
  const progress = useSelector(state => {
    const record = pinnedCommandId ? state.learning.progress[pinnedCommandId] : null
    return record ? Math.min(1, record.reps / record.targetReps) : 0
  })

  if (!pinnedCommandId) return null

  const command = commandById(pinnedCommandId)
  const Icon = command.svg ?? SettingsIcon

  return (
    <div
      role='img'
      aria-label={`Pinned command: ${command.label}`}
      data-testid='pinned-command'
      className={css({
        position: 'fixed',
        right: 0,
        // Align the ring's center with the home icon in the nav bar row. Measured in the browser, that center sits
        // max(11px, safe area) + 13.5px above the bottom edge, and the ring's center is 36.16px above the box bottom,
        // so the box bottom is offset - 22.5px. Written out literally because Panda only extracts static values; an
        // interpolated template literal is dropped, leaving the widget at its static position at the end of the page.
        bottom: 'calc(max(11px, token(spacing.safeAreaBottom)) - 22.5px)',
        zIndex: 'pinnedCommand',
        pointerEvents: 'none',
      })}
    >
      <PinnedCommandRing progress={progress} complete={progress >= 1}>
        <Icon size={14} fill={token('colors.gray50')} cssRaw={css.raw({ flex: 'none' })} />
      </PinnedCommandRing>
    </div>
  )
}

export default PinnedCommand
