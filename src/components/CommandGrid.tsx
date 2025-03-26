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

/** Renders a grid of commands. */
const CommandGrid = ({
  customize,
  onSelect,
  selectedCommand,
}: {
  customize?: boolean
  onSelect?: (command: Command | null) => void
  selectedCommand?: Command
}) => {
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<'alphabetical' | 'type'>('type')
  const [previousSortOrder, setPreviousSortOrder] = useState(sortOrder)
  const [isFading, setIsFading] = useState(false)
  const commands = useFilteredCommands(search, { platformCommandsOnly: true })

  useEffect(() => {
    if (sortOrder !== previousSortOrder) {
      setIsFading(true)
      setTimeout(() => {
        setPreviousSortOrder(sortOrder)
        setIsFading(false)
      }, 300)
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
        })}
      >
        <SearchCommands onInput={setSearch} />
        <SortButton onSortChange={setSortOrder} />
      </div>

      {/* Fade-in transition for command views */}
      <div
        className={css({
          textAlign: 'left',
          opacity: isFading ? 0 : 1,
          transition: 'opacity 0.5s ease',
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
                isGrid={true}
              />
            )
          } else if (previousSortOrder === 'type') {
            return COMMAND_GROUPS.map(group => {
              const commands = group.commands
                .map(commandById)
                .filter((command): command is Command => !!command.gesture)

              return commands.length > 0 ? (
                <CommandsGroup
                  title={group.title}
                  commands={commands}
                  customize={customize}
                  key={group.title}
                  onSelect={onSelect}
                  selectedCommand={selectedCommand}
                  isGrid={true}
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
                isGrid={true}
              />
            )
          }
        })()}
      </div>
    </div>
  )
}

export default CommandGrid
