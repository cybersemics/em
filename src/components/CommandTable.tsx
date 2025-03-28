import { useEffect, useRef, useState } from 'react'
import { SwitchTransition } from 'react-transition-group'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
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
import { SortButtonHandle } from './SortButton'

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

interface CommandTableProps {
  customize?: boolean
  onSelect?: (command: Command | null) => void
  selectedCommand?: Command
  viewType?: 'table' | 'grid'
}

/** Renders a table of commands with a fade-in animation when sorting changes. */
const CommandTable = ({ customize, onSelect, selectedCommand, viewType = 'table' }: CommandTableProps) => {
  const [search, setSearch] = useState('')
  const commands = useFilteredCommands(search, { platformCommandsOnly: true })
  const [sortOrder, setSortOrder] = useState<'alphabetical' | 'type'>('type')
  const sortButtonRef = useRef<SortButtonHandle>(null)

  /** Closes the sort dropdown when the user scrolls. */
  const handleScroll = () => {
    sortButtonRef.current?.closeDropdown()
  }

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  const renderContent = () => {
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
    } else if (sortOrder === 'type') {
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
    } else {
      const commandsWithGestures = commands.filter((command): command is Command => !!command.gesture)
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
  }

  return (
    <div>
      <div
        className={css({
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: '5px',
          willChange: 'transform',
          transform: 'translateZ(0)',
          position: 'relative',
          zIndex: 1,
        })}
      >
        <SearchCommands onInput={setSearch} />
        <SortButton ref={sortButtonRef} onSortChange={setSortOrder} />
      </div>

      <SwitchTransition>
        <FadeTransition key={`${sortOrder}-${search}`} in={true} duration='medium' unmountOnExit>
          <div className={css({ textAlign: 'left' })}>{renderContent()}</div>
        </FadeTransition>
      </SwitchTransition>
    </div>
  )
}

export default CommandTable
