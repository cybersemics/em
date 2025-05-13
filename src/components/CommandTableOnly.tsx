import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import CommandRow from './CommandRow'

/** Renders a table of commands, with nothing else added. */
const CommandTableOnly = ({
  commands,
  selectedCommand,
  customize,
  onSelect,
  search,
}: {
  commands: (Command | null)[]
  selectedCommand?: Command
  customize?: boolean
  onSelect?: (command: Command | null) => void
  /** Search text that will be highlighted within the matched command title. */
  search?: string
}) => {
  return (
    <table className={css({ fontSize: '14px', width: '100%' })}>
      <tbody>
        {commands.map(command => {
          return (
            <CommandRow
              customize={customize}
              key={command?.id}
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
