import { useMemo, useState } from 'react'
import Command from '../@types/Command'
import CommandDifficulty from '../@types/CommandDifficulty'
import CommandGroup from '../@types/CommandGroup'
import CommandSortType from '../@types/CommandSortType'
import { isTouch } from '../browser'
import { commandById, globalCommands } from '../commands'
import { COMMAND_DIFFICULTIES } from '../constants'
import storageModel from '../stores/storageModel'
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
  id: CommandGroup['id'] | 'results' | 'allCommands' | 'recent'
  title: string
  commands: Command[]
  /** The difficulty of the category represented by this section. Only defined when commands are grouped by type. */
  difficulty?: Pick<CommandDifficulty, 'id' | 'title'>
}

/** The sections useCommandList derives, in display order. */
export interface UseCommandListReturn {
  sections: CommandSection[]
}

/** Derives command sections from the search and ordering owned by its caller. */
const useCommandList = ({
  search,
  sortOrder,
  sortActiveCommandsFirst = false,
}: {
  search: string
  sortOrder: CommandSortType
  sortActiveCommandsFirst?: boolean
}): UseCommandListReturn => {
  const [recentCommands] = useState(() => storageModel.get('recentCommands'))
  const filteredCommands = useFilteredCommands(search, {
    platformCommandsOnly: true,
    recentCommands,
    sortActiveCommandsFirst,
  })

  const sections = useMemo<CommandSection[]>(() => {
    if (search) return [{ id: 'results', title: 'Results', commands: filteredCommands }]
    if (sortOrder === 'recent') return [{ id: 'recent', title: 'Recently used', commands: filteredCommands }]
    if (sortOrder === 'type') return commandSectionsByCategory
    return [{ id: 'allCommands', title: 'All Commands', commands: commandsSortedByLabel }]
  }, [search, sortOrder, filteredCommands])

  return { sections }
}

export default useCommandList
