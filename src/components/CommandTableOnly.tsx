import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import nonNull from '../util/nonNull'
import CommandTableItem from './CommandTableItem'

/** Renders a table of commands, with nothing else added. */
const CommandTableOnly = ({
  commands,
  selectedCommand,
  customize,
  onSelect,
  search,
  isMobileGestures,
}: {
  commands: Command[]
  selectedCommand?: Command
  customize?: boolean
  onSelect?: (command: Command | null) => void
  /** Search text that will be highlighted within the matched command title. */
  search?: string
  /** See: CommandTableItem['isMobileGestures']. */
  isMobileGestures?: boolean
}) => {
  const fontSize = useSelector(state => state.fontSize)
  return (
    <table className={css({ fontSize: '14px', width: '100%' })}>
      <tbody
        className={css({ display: 'table-row-group' })}
        // anchor all `em` units used in children to `fontSize`
        style={{ fontSize }}
      >
        {commands.filter(nonNull).map(command => {
          const selected = selectedCommand && command?.id === selectedCommand.id
          return (
            <CommandTableItem
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
              isMobileGestures={isMobileGestures}
            />
          )
        })}
      </tbody>
    </table>
  )
}

export default CommandTableOnly
