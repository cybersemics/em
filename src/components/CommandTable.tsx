import { useEffect, useState } from 'react'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import { isTouch } from '../browser'
import { commandById, globalCommands } from '../commands'
import { COMMAND_GROUPS } from '../constants'
import useFilteredCommands from '../hooks/useFilteredCommands'
import conjunction from '../util/conjunction'
import keyValueBy from '../util/keyValueBy'
import CommandsGroup from './CommandsGroup'
import SearchCommands from './SearchCommands'
import SortButton from './SortButton'

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

/** Renders a table of commands with a fade-in animation when sorting changes. */
interface CommandTableProps {
  customize?: boolean
  onSelect?: (command: Command | null) => void
  selectedCommand?: Command
  viewType?: 'table' | 'grid'
}
const CommandTable = ({ customize, onSelect, selectedCommand, viewType = 'table' }: CommandTableProps) => {
  const [search, setSearch] = useState('')
  const commands = useFilteredCommands(search, { platformCommandsOnly: true })
  const [sortOrder, setSortOrder] = useState<'alphabetical' | 'type'>('type')
  const [previousSortOrder, setPreviousSortOrder] = useState(sortOrder)
  const [isFading, setIsFading] = useState(false)

  useEffect(() => {
    if (sortOrder !== previousSortOrder) {
      setIsFading(true) // Start fading out
      setTimeout(() => {
        setPreviousSortOrder(sortOrder) // Update to new view after fade out
        setIsFading(false) // Start fading in
      }, 250) // Matches transition duration
    }
  }, [sortOrder, previousSortOrder])

  return (
    <div>
      <div
        className={css({
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: '5px',

          /* On iOS, the sticky headers won't properly stick to the top of the scrollable container (causing a sliver
             of content to peek through) unless we force the container into a new stacking context. */
          willChange: 'transform',
          transform: 'translateZ(0)',
        })}
      >
        <SearchCommands onInput={setSearch} />
        <SortButton onSortChange={setSortOrder} />
      </div>

      {/* Smooth Fade-in Transition */}
      <div
        className={css({
          textAlign: 'left',
          opacity: isFading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
        })}
      >
        {(() => {
          if (search) {
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
          } else if (previousSortOrder === 'type') {
            return COMMAND_GROUPS.map(group => {
              const commands = group.commands
                .map(commandById)
                .filter((command): command is Command => (isTouch ? !!command.gesture : !!command.keyboard))

              return commands.length > 0 ? (
                <CommandsGroup
                  title={group.title}
                  commands={commands}
                  customize={customize}
                  key={group.title}
                  onSelect={onSelect}
                  selectedCommand={selectedCommand}
                  viewType={viewType}
                />
              ) : null
            })
          } else if (previousSortOrder === 'alphabetical') {
            // Filter commands to include only those with gestures
            const commandsWithGestures = commands.filter((command): command is Command => !!command.gesture)

            // Sort commands alphabetically by their ID or name
            const sortedCommands = commandsWithGestures.sort((a, b) => a.label.localeCompare(b.label))

            return (
              <CommandsGroup
                title={'All Commands'}
                commands={sortedCommands}
                selectedCommand={selectedCommand}
                customize={customize}
                onSelect={onSelect}
                viewType={viewType}
              />
            )
          }
        })()}
      </div>
    </div>
  )
}

export default CommandTable
