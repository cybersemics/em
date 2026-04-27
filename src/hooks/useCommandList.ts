import { useMemo, useState } from 'react'
import Command from '../@types/Command'
import CommandSortType from '../@types/CommandSortType'
import { isTouch } from '../browser'
import { commandById, globalCommands } from '../commands'
import { COMMAND_GROUPS } from '../constants'
import conjunction from '../util/conjunction'
import keyValueBy from '../util/keyValueBy'
import useFilteredCommands from './useFilteredCommands'

const commandsGroupedMap = keyValueBy(
  COMMAND_GROUPS.flatMap(group => group.commands),
  true,
)
const commandsUngrouped = globalCommands.filter(
  command => !commandsGroupedMap[command.id] && !command.hideFromHelp && (isTouch ? command.gesture : command.keyboard),
)
if (commandsUngrouped.length > 0) {
  throw new Error(
    `useCommandList groups are missing command(s). Please add ${conjunction(
      commandsUngrouped.map(command => command.id),
    )} to the appropriate group in COMMAND_GROUPS (constants.ts), or add hideFromHelp: true to the Command.`,
  )
}

const commandsGroupedByType: { title: string; commands: Command[] }[] = COMMAND_GROUPS.map(group => ({
  title: group.title,
  commands: group.commands.map(commandById).filter(command => (isTouch ? command.gesture : command.keyboard)),
})).filter(group => group.commands.length > 0)

const commandsSortedByLabel: Command[] = COMMAND_GROUPS.flatMap(group => group.commands)
  .map(commandById)
  .filter(command => (isTouch ? command.gesture : command.keyboard))
  .sort((a, b) => a.label.localeCompare(b.label))

export interface CommandGroup {
  title: string
  commands: Command[]
}

export interface UseCommandListReturn {
  search: string
  setSearch: (value: string) => void
  sortOrder: CommandSortType
  setSortOrder: (value: CommandSortType) => void
  /** Filtered commands organized into groups. One group when searching ("Results") or sorting alphabetically ("All Commands"); multiple groups when sorting by type. */
  groups: CommandGroup[]
}

/** Owns the search and sort state shared by the command-browsing surfaces (CommandTable in Help/CustomizeToolbar, CommandUniverseGrid in MobileCommandUniverse). Returns groups of commands ready for rendering. */
const useCommandList = (): UseCommandListReturn => {
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<CommandSortType>('type')
  const filteredCommands = useFilteredCommands(search, { platformCommandsOnly: true })

  const groups = useMemo<CommandGroup[]>(() => {
    if (search) return [{ title: 'Results', commands: filteredCommands }]
    if (sortOrder === 'type') return commandsGroupedByType
    return [{ title: 'All Commands', commands: commandsSortedByLabel }]
  }, [search, sortOrder, filteredCommands])

  return { search, setSearch, sortOrder, setSortOrder, groups }
}

export default useCommandList
