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
import CommandTableOnly from './CommandTableOnly'
import CommandsGroup from './CommandsGroup'
import FadeTransition from './FadeTransition'
import SearchCommands from './SearchCommands'
import SortButton from './SortButton'

// define the grouping and ordering of commands
const groups: {
  title: string
  commands: CommandId[]
}[] = [
  {
    title: 'Navigation',
    commands: [
      'cursorBack',
      'cursorForward',
      'cursorNext',
      'cursorPrev',
      'jumpBack',
      'jumpForward',
      'moveCursorBackward',
      'moveCursorForward',
      'commandPalette',
      'home',
      'search',
      'selectAll',
    ],
  },
  {
    title: 'Creating thoughts',
    commands: [
      'categorize',
      'newThought',
      'newThoughtAbove',
      'newSubthought',
      'newSubthoughtTop',
      'newUncle',
      'newGrandChild',
      'extractThought',
      'generateThought',
    ],
  },
  {
    title: 'Deleting thoughts',
    commands: ['delete', 'archive', 'collapseContext', 'clearThought'],
  },
  {
    title: 'Moving thoughts',
    commands: ['indent', 'outdent', 'bumpThoughtDown', 'moveThoughtDown', 'moveThoughtUp'],
  },
  {
    title: 'Editing thoughts',
    commands: [
      'join',
      'splitSentences',
      'bold',
      'italic',
      'strikethrough',
      'underline',
      'code',
      'copyCursor',
      'removeFormat',
    ],
  },
  {
    title: 'Oops',
    commands: ['undo', 'redo'],
  },
  {
    title: 'Special Views',
    commands: [
      'note',
      'swapNote',
      'toggleContextView',
      'proseView',
      'toggleTableView',
      'toggleSort',
      'heading0',
      'heading1',
      'heading2',
      'heading3',
      'heading4',
      'heading5',
    ],
  },
  {
    title: 'Visibility',
    commands: ['pin', 'pinAll', 'toggleDone', 'toggleHiddenThoughts'],
  },
  {
    title: 'Settings',
    commands: ['customizeToolbar'],
  },
  {
    title: 'Help',
    commands: ['help'],
  },
  {
    title: 'Cancel',
    commands: ['cancel'],
  },
]

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
  const [sortOrder, setSortOrder] = useState<CommandSortType>('type')

  /** This render function is used to render the content of the command table.
   * It renders groups of commands if the search is empty.
   * It renders a single command if the search is not empty.
   *
   * Depending on the viewType prop, it renders the commands in a table or a grid.
   */
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
          .filter(command => (isTouch ? !!command.gesture : !!command.keyboard))

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
      const commandsWithGestures = commands.filter(command => !!command.gesture)
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
          position: 'relative',
          zIndex: 1,
        })}
      >
        <SearchCommands onInput={setSearch} />
        <SortButton onSortChange={setSortOrder} />
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
