/**
 * This hook is used by command-browsing surfaces: like CommandTable, CommandUniverseGrid, etc.
 * It centralizes three pieces of shared logic that those surfaces would otherwise re-implement independently:
 *
 * 1. Search and sort state
 * It maintains the `search` string and `sortOrder` state which a consumer component's search input and sort button can drive.
 *
 * 2. Render decision tree
 * The hook unifies the logic for what to render, given the current search and sort state.
 * When a search query is active, it always overrides sort and collapses results into a single "Results"
 * group of fuzzy matches across all commands.
 * When there is no search query, `sortOrder` determines whether to render commands grouped by type
 * (the multi-section COMMAND_GROUPS layout) or as a single alphabetical list.
 *
 * 3. Rendered output shape
 * The hook exposes the commands to render as an array of `{ title, commands }` groups.
 * This uniform shape allows consumers' render logic to map over `groups` without special cases for different display modes.
 *
 */
import { useMemo, useState } from 'react'
import Command from '../@types/Command'
import CommandSortType from '../@types/CommandSortType'
import { isTouch } from '../browser'
import { commandById, globalCommands } from '../commands'
import { COMMAND_GROUPS } from '../constants'
import conjunction from '../util/conjunction'
import keyValueBy from '../util/keyValueBy'
import useFilteredCommands from './useFilteredCommands'

/**
 * This build-time guard ensures every command that is *visible* on the current platform is reachable from at least one COMMAND_GROUPS entry.
 * Without this, a newly added Command that someone forgot to slot into a group would be inaccessible.
 */
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

/**
 * Commands organized into individual arrays based on their "type".
 * Only commands executable on the current platform are included.
 */
const commandsGroupedByType: { title: string; commands: Command[] }[] = COMMAND_GROUPS.map(group => ({
  title: group.title,
  commands: group.commands.map(commandById).filter(command => (isTouch ? command.gesture : command.keyboard)),
})).filter(group => group.commands.length > 0)

/**
 * Commands in a single flat array, sorted alphabetically by their label.
 * Only commands executable on the current platform are included.
 */
const commandsSortedByLabel: Command[] = COMMAND_GROUPS.flatMap(group => group.commands)
  .map(commandById)
  .filter(command => (isTouch ? command.gesture : command.keyboard))
  .sort((a, b) => a.label.localeCompare(b.label))

/** A group of commands in an array, with a title. Consumers should iterate over `commands` to render each command. */
export interface CommandGroup {
  title: string
  commands: Command[]
}

export interface UseCommandListReturn {
  /** The current search query. If populated, `groups` will contain a single `CommandGroup` titled "Results" with fuzzy matched search results. */
  search: string

  /** Sets the current search query. It also updates the filtered `groups`. */
  setSearch: (value: string) => void

  /** The current sort mode. Only consulted when `search` is empty. */
  sortOrder: CommandSortType

  /** Sets the current sort mode. The selected sort mode is only consulted when `search` is empty. */
  setSortOrder: (value: CommandSortType) => void

  /** The commands to render, organized into groups with titles. The shape of this data depends on the current `search` and `sortOrder` state. */
  groups: CommandGroup[]
}

/** A hook that allows consumers to access, search and sort a list of commands. */
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
