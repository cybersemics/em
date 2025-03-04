import { shallowEqual, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import { TOOLBAR_DEFAULT_COMMANDS } from '../constants'
import getUserToolbar from '../selectors/getUserToolbar'
import CommandColumn from './CommandColumn'

/** Renders a table of commands, with nothing else added. */
const CommandGridOnly = ({
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
  onSelect?: (command: Command | null) => void
  applyIndexInToolbar?: boolean
  /** Search text that will be highlighted within the matched command title. */
  search?: string
}) => {
  // custom user toolbar
  // fall back to defaults if user does not have Settings defined
  const commandIds = useSelector(state => {
    const userCommandIds = getUserToolbar(state)
    return userCommandIds || state.storageCache?.userToolbar || TOOLBAR_DEFAULT_COMMANDS
  }, shallowEqual)

  return (
    <table className={css({ fontSize: '14px' })}>
      <tbody
        className={css({
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
        })}
      >
        {commands.map(command => {
          const indexInToolbar = commandIds.findIndex(id => id === command?.id)
          return (
            <CommandColumn
              customize={customize}
              indexInToolbar={indexInToolbar !== -1 && applyIndexInToolbar ? indexInToolbar + 1 : null}
              onSelect={onSelect}
              selected={selectedCommand && command?.id === selectedCommand.id}
              command={command}
              search={search}
            />
          )
        })}
      </tbody>
    </table>
  )
}
export default CommandGridOnly
