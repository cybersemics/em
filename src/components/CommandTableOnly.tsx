import { shallowEqual, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import { TOOLBAR_DEFAULT_COMMANDS } from '../constants'
import getUserToolbar from '../selectors/getUserToolbar'
import CommandItem from './CommandItem'

type ViewType = 'grid' | 'table'

/** Renders a table of commands, with nothing else added. */
const CommandTableOnly = ({
  viewType = 'table',
  commands,
  selectedCommand,
  customize,
  onSelect,
  applyIndexInToolbar,
  search,
}: {
  viewType?: ViewType
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
          display: viewType === 'grid' ? 'grid' : 'table-row-group',
          ...(viewType === 'grid' && {
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
          }),
        })}
      >
        {commands.map(command => {
          const indexInToolbar = commandIds.findIndex(id => id === command?.id)
          return (
            <CommandItem
              viewType={viewType}
              customize={customize}
              key={command?.id}
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

export default CommandTableOnly
