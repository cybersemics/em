import Command from '../@types/Command'
import { CommandViewType } from '../@types/CommandViewType'
import CommandRowOnly from './CommandRowOnly'

/** Renders all of a command's details as either a grid item or table row. */
const CommandItem = ({
  viewType = 'table',
  customize,
  onSelect,
  selected,
  command,
  search,
}: {
  viewType?: CommandViewType
  customize?: boolean
  onSelect?: (command: Command | null) => void
  selected?: boolean
  command: Command | null
  /** Search text that will be highlighted within the matched command title. */
  search?: string
}) => {
  if (!command) return null

  return (
    <CommandRowOnly
      command={command}
      search={search}
      selected={selected}
      onClick={
        onSelect &&
        ((_, command) => {
          onSelect(selected ? null : command)
        })
      }
      style={{ paddingInline: 0 }}
      isTable
      viewType={viewType}
      alwaysShowDescription
      customize={customize}
    />
  )
}

export default CommandItem
