import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import { CommandViewType } from '../@types/CommandViewType'
import CommandItem from './CommandItem'

/** Renders a table of commands, with nothing else added. */
const CommandTableOnly = ({
  viewType = 'table',
  commands,
  selectedCommand,
  customize,
  onSelect,
  search,
}: {
  viewType?: CommandViewType
  commands: (Command | null)[]
  selectedCommand?: Command
  customize?: boolean
  onSelect?: (command: Command | null) => void
  /** Search text that will be highlighted within the matched command title. */
  search?: string
}) => {
  const fontSize = useSelector(state => state.fontSize)
  return (
    <table className={css({ fontSize: '14px', width: viewType === 'grid' ? undefined : '100%' })}>
      <tbody
        className={css({
          display: viewType === 'grid' ? 'grid' : 'table-row-group',
          ...(viewType === 'grid' && {
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
          }),
        })}
        // anchor all `em` units used in children to `fontSize`
        style={{ fontSize }}
      >
        {commands
          .filter(command => command !== null)
          .map(command => {
            const selected = selectedCommand && command?.id === selectedCommand.id
            return (
              <CommandItem
                viewType={viewType}
                customize={customize}
                key={command.id}
                onClick={
                  onSelect &&
                  ((_, command) => {
                    onSelect(selected ? null : command)
                  })
                }
                selected={selected}
                command={command}
                search={search}
                alwaysShowDescription
                tableMode
              />
            )
          })}
      </tbody>
    </table>
  )
}

export default CommandTableOnly
