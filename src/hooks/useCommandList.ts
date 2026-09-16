/**
 * This hook supplies the command sections rendered by CommandTable and MobileCommandUniverse.
 * It centralizes three pieces of command-browsing logic:
 *
 * 1. Search and sort state
 * It maintains the `search` string and `sortOrder` state which a consumer component's search input and sort button can drive.
 *
 * 2. Render decision tree
 * The hook unifies the logic for what to render, given the current search and sort state.
 * When a search query is active, it always overrides sort and collapses results into a single "Results"
 * section of fuzzy matches across all commands.
 * When there is no search query, `sortOrder` determines whether to render commands grouped by type
 * (the multi-section COMMAND_DIFFICULTIES layout) or as a single alphabetical list.
 *
 * 3. Rendered output shape
 * The hook exposes the commands to render as an array of `{ id, title, commands, difficulty? }` sections.
 * This uniform shape allows consumers' render logic to map over `sections` without special cases for different display modes.
 *
 */
import { useMemo, useState } from 'react'
import Command from '../@types/Command'
import CommandDifficulty from '../@types/CommandDifficulty'
import CommandGroup from '../@types/CommandGroup'
import CommandSortType from '../@types/CommandSortType'
import { isTouch } from '../browser'
import { commandById, globalCommands } from '../commands'
import { COMMAND_DIFFICULTIES } from '../constants'
import conjunction from '../util/conjunction'
import keyValueBy from '../util/keyValueBy'
import useFilteredCommands from './useFilteredCommands'

/**
 * This build-time guard ensures every command that is *visible* on the current platform is reachable from at least one COMMAND_DIFFICULTIES entry.
 * Without this, a newly added Command that someone forgot to slot into a group would be inaccessible.
 */
const commandsGroupedMap = keyValueBy(
  COMMAND_DIFFICULTIES.flatMap(level => level.groups.flatMap(group => group.commands)),
  true,
)
const commandsUngrouped = globalCommands.filter(
  command => !commandsGroupedMap[command.id] && !command.hideFromHelp && (isTouch ? command.gesture : command.keyboard),
)
if (commandsUngrouped.length > 0) {
  throw new Error(
    `useCommandList groups are missing command(s). Please add ${conjunction(
      commandsUngrouped.map(command => command.id),
    )} to the appropriate group in COMMAND_DIFFICULTIES (constants.ts), or add hideFromHelp: true to the Command.`,
  )
}

/**
 * Display sections for command categories, tagged with their difficulty.
 * Sections are kept in difficulty order, so consumers can render a level heading whenever the difficulty ID changes.
 * Only commands executable on the current platform are included.
 */
const commandSectionsByCategory: CommandSection[] = COMMAND_DIFFICULTIES.flatMap(level =>
  level.groups
    .map(group => ({
      id: group.id,
      title: group.title,
      difficulty: { id: level.id, title: level.title },
      commands: group.commands.map(commandById).filter(command => (isTouch ? command.gesture : command.keyboard)),
    }))
    .filter(section => section.commands.length > 0),
)

/**
 * Commands in a single flat array, sorted alphabetically by their label.
 * Only commands executable on the current platform are included.
 */
const commandsSortedByLabel: Command[] = COMMAND_DIFFICULTIES.flatMap(level =>
  level.groups.flatMap(group => group.commands),
)
  .map(commandById)
  .filter(command => (isTouch ? command.gesture : command.keyboard))
  .sort((a, b) => a.label.localeCompare(b.label))

/** A titled display section containing a category, search results, or the alphabetical command list. */
interface CommandSection {
  id: CommandGroup['id'] | 'results' | 'allCommands'
  title: string
  commands: Command[]
  /** The difficulty of the category represented by this section. Only defined when commands are grouped by type. */
  difficulty?: Pick<CommandDifficulty, 'id' | 'title'>
}

export interface UseCommandListReturn {
  /** The current search query. If populated, `sections` will contain a single `CommandSection` titled "Results" with fuzzy matched search results. */
  search: string

  /** Sets the current search query. It also updates the filtered `sections`. */
  setSearch: (value: string) => void

  /** The current sort mode. Only consulted when `search` is empty. */
  sortOrder: CommandSortType

  /** Sets the current sort mode. The selected sort mode is only consulted when `search` is empty. */
  setSortOrder: (value: CommandSortType) => void

  /** The commands to render, organized into titled sections. The shape of this data depends on the current `search` and `sortOrder` state. */
  sections: CommandSection[]
}

/** A hook that allows consumers to access, search and sort a list of commands. */
const useCommandList = (): UseCommandListReturn => {
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<CommandSortType>('type')
  const filteredCommands = useFilteredCommands(search, { platformCommandsOnly: true })

  const sections = useMemo<CommandSection[]>(() => {
    if (search) return [{ id: 'results', title: 'Results', commands: filteredCommands }]
    if (sortOrder === 'type') return commandSectionsByCategory
    return [{ id: 'allCommands', title: 'All Commands', commands: commandsSortedByLabel }]
  }, [search, sortOrder, filteredCommands])

  return { search, setSearch, sortOrder, setSortOrder, sections }
}

export default useCommandList
