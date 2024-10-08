import { shallowEqual, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Shortcut from '../@types/Shortcut'
import { TOOLBAR_DEFAULT_SHORTCUTS } from '../constants'
import getUserToolbar from '../selectors/getUserToolbar'
import ShortcutRow from './ShortcutRow'

/** Renders a table of shortcuts, with nothing else added. */
const ShortcutTableOnly = ({
  shortcuts,
  selectedShortcut,
  customize,
  onSelect,
  applyIndexInToolbar,
  keyboardInProgress
}: {
  shortcuts: (Shortcut | null)[]
  selectedShortcut?: Shortcut
  customize?: boolean
  onSelect?: (shortcut: Shortcut | null) => void
  applyIndexInToolbar?: boolean
  keyboardInProgress?: string
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
        {shortcuts.map(shortcut => {
          const indexInToolbar = shortcutIds.findIndex(id => id === shortcut?.id)
          return (
            <ShortcutRow
              customize={customize}
              key={shortcut?.id}
              indexInToolbar={indexInToolbar !== -1 && applyIndexInToolbar ? indexInToolbar + 1 : null}
              onSelect={onSelect}
              selected={selectedShortcut && shortcut?.id === selectedShortcut.id}
              shortcut={shortcut}
              keyboardInProgress={keyboardInProgress}
            />
          )
        })}
      </tbody>
    </table>
  )
}
export default ShortcutTableOnly
