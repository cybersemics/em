import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { commandById } from '../../commands'
import SettingsIcon from '../icons/SettingsIcon'
import PinnedCommandRing from './PinnedCommandRing'

/** Shows the selected command in a sticky corner slot alongside the NavBar. */
const PinnedCommand = () => {
  const pinnedCommandId = useSelector(state => state.learning.pinnedCommandId)
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
        <div data-testid='pinned-command' role='img' aria-label={`Pinned command: ${command.label}`}>
          <PinnedCommandRing key={pinnedCommandId} progress={0}>
            <Icon size={14} fill={token('colors.gray50')} cssRaw={css.raw({ flex: 'none' })} />
          </PinnedCommandRing>
        </div>
      </div>
    </div>
  )
}
export default PinnedCommand
