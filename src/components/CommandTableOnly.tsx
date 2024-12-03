import { shallowEqual, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import { TOOLBAR_DEFAULT_SHORTCUTS } from '../constants'
import getUserToolbar from '../selectors/getUserToolbar'
import ShortcutRow from './ShortcutRow'

/** Renders a table of shortcuts, with nothing else added. */
const CommandTableOnly = ({
  commands,
  selectedCommand,
  customize,
  onSelect,
  applyIndexInToolbar,
  search,
}: {
  commands: (Command | null)[]
  selectedCommand?: Command
  customize?: boolean
  onSelect?: (shortcut: Command | null) => void
  applyIndexInToolbar?: boolean
  /** Search text that will be highlighted within the matched shortcut title. */
  search?: string
}) => {
  // custom user toolbar
  // fall back to defaults if user does not have Settings defined
  const shortcutIds = useSelector(state => {
    const userShortcutIds = getUserToolbar(state)
    return userShortcutIds || state.storageCache?.userToolbar || TOOLBAR_DEFAULT_SHORTCUTS
  }, shallowEqual)

  return (
    <table className={css({ fontSize: '14px' })}>
      <tbody>
        {commands.map(command => {
          const indexInToolbar = shortcutIds.findIndex(id => id === command?.id)
          return (
            <ShortcutRow
              customize={customize}
              key={command?.id}
              indexInToolbar={indexInToolbar !== -1 && applyIndexInToolbar ? indexInToolbar + 1 : null}
              onSelect={onSelect}
              selected={selectedCommand && command?.id === selectedCommand.id}
              shortcut={command}
              search={search}
            />
          )
        })}
      </tbody>
    </table>
  )
}
export default CommandTableOnly
