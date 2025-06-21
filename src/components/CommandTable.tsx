import { useState } from 'react'
import { SwitchTransition } from 'react-transition-group'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import CommandSortType from '../@types/CommandSortType'
import { isTouch } from '../browser'
import { commandById, globalCommands } from '../commands'
import { COMMAND_GROUPS } from '../constants'
import useFilteredCommands from '../hooks/useFilteredCommands'
import conjunction from '../util/conjunction'
import keyValueBy from '../util/keyValueBy'
import CommandsGroup from './CommandsGroup'
import FadeTransition from './FadeTransition'
import SearchCommands from './SearchCommands'
import SortButton from './SortButton'

// assert that groups include all necessary commands
const commandsGroupedMap = keyValueBy(
  COMMAND_GROUPS.flatMap(group => group.commands),
  true,
)
const commandsUngrouped = globalCommands.filter(
  command => !commandsGroupedMap[command.id] && !command.hideFromHelp && (isTouch ? command.gesture : command.keyboard),
)
if (commandsUngrouped.length > 0) {
  throw new Error(
    `CommandTable groups are missing command(s). Please add ${conjunction(
      commandsUngrouped.map(command => command.id),
    )} to the appropriate group, or add hideFromHelp: true to the Command.`,
  )
}

// Calculate commands at load-time for the various display types and sort orders.
// We filter out commands and groups that are not available on the current platform.
// TODO: Currently, CommandTable uses a constant value COMMAND_GROUPS as the source of
// truth for commands. This needs to change to address #2863.

/* Commands grouped by type. Current platform only. */
const commandsGroupedByType = COMMAND_GROUPS.map(group => ({
  title: group.title,
  commands: group.commands.map(commandById).filter(command => (isTouch ? command.gesture : command.keyboard)),
})).filter(group => group.commands.length > 0)

/* Commands sorted by label, A-Z. Current platform only. */
const commandsSortedByLabel = COMMAND_GROUPS.flatMap(group => group.commands)
  .map(commandById)
  .filter(command => (isTouch ? command.gesture : command.keyboard))
  .sort((a, b) => a.label.localeCompare(b.label))

interface CommandTableProps {
  customize?: boolean
  onSelect?: (command: Command | null) => void
  selectedCommand?: Command
  viewType?: 'table' | 'grid'
}

interface CommandTableContentProps extends CommandTableProps {
  search: string
  commands: Command[]
  sortOrder: CommandSortType
}

/** Renders the content of the command table.
 * It renders groups of commands if the search is empty.
 * It renders a single command if the search is not empty.
 *
 * Depending on the viewType prop, it renders the commands in a table or a grid.
 */
const CommandTableContent = ({
  search,
  commands,
  selectedCommand,
  customize,
  onSelect,
  viewType = 'table',
  sortOrder,
}: CommandTableContentProps) => {
  if (search) {
    /* Show command search results */
    return (
      <CommandsGroup
        title={'Results'}
        commands={commands}
        selectedCommand={selectedCommand}
        customize={customize}
        onSelect={onSelect}
        search={search}
        viewType={viewType}
      />
    )
  } else if (sortOrder === 'type') {
    /* Show commands grouped by type */
    return commandsGroupedByType.map(group => {
      const commands = group.commands

      return (
        <CommandsGroup
          title={group.title}
          commands={commands}
          customize={customize}
          key={group.title}
          onSelect={onSelect}
          selectedCommand={selectedCommand}
          viewType={viewType}
        />
      )
    })
  } else {
    /* All commands sorted by label, A-Z */
    return (
      <CommandsGroup
        title={'All Commands'}
        commands={commandsSortedByLabel}
        selectedCommand={selectedCommand}
        customize={customize}
        onSelect={onSelect}
        viewType={viewType}
      />
    )
  }
}

/** Renders a table of commands with a fade-in animation when sorting changes. */
const CommandTable = ({ customize, onSelect, selectedCommand, viewType = 'table' }: CommandTableProps) => {
  const [search, setSearch] = useState('')
  const { commands } = useFilteredCommands(search, { platformCommandsOnly: true })
  const [sortOrder, setSortOrder] = useState<CommandSortType>('type')

  return (
    <div>
      <div
        className={css({
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: '5px',
          position: 'relative',
          zIndex: 1,
        })}
      >
        <SearchCommands onInput={setSearch} />
        <SortButton onSortChange={setSortOrder} />
      </div>

      <SwitchTransition>
        <FadeTransition key={`${sortOrder}-${search}`} in={true} type='medium' unmountOnExit>
          <CommandTableContent
            search={search}
            commands={commands}
            selectedCommand={selectedCommand}
            customize={customize}
            onSelect={onSelect}
            viewType={viewType}
            sortOrder={sortOrder}
          />
        </FadeTransition>
      </SwitchTransition>
    </div>
  )
}

export default CommandTable
