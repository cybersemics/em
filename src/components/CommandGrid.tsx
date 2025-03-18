import { FC, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import CommandId from '../@types/CommandId'
import { isTouch } from '../browser'
import { commandById, globalCommands } from '../commands'
import useFilteredCommands from '../hooks/useFilteredCommands'
import theme from '../selectors/theme'
import conjunction from '../util/conjunction'
import keyValueBy from '../util/keyValueBy'
import CommandsGroup from './CommandsGroup'
import SortButton from './SortButton'
import SearchIcon from './icons/SearchIcon'

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
      'newThought',
      'newThoughtAbove',
      'newSubthought',
      'newSubthoughtTop',
      'newUncle',
      'newGrandChild',
      'subcategorizeOne',
      'subcategorizeAll',
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
    commands: ['join', 'splitSentences', 'bold', 'italic', 'strikethrough', 'underline', 'code', 'copyCursor'],
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
    commands: ['help', 'openGestureCheatsheet'],
  },
  {
    title: 'Cancel',
    commands: ['cancel'],
  },
]

const commandsGroupedMap = keyValueBy(
  groups.flatMap(group => group.commands),
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

/** Search bar for filtering commands. */
const SearchCommands: FC<{ onInput?: (value: string) => void }> = ({ onInput }) => {
  const isLightTheme = useSelector(state => theme(state) === 'Light')

  return (
    <div id='search' className={css({ flexGrow: 1, border: 'solid 1px {colors.gray50}', borderRadius: '8px' })}>
      <div className={css({ position: 'relative' })}>
        <div
          className={css({
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none'
          })}
        >
          <SearchIcon size={16} fill={isLightTheme ? '#666' : '#999'} />
        </div>
        <input
          type='text'
          placeholder='Search gestures...'
          onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
            onInput?.(e.target.value)
          }}
          className={css({
            marginLeft: 0,
            marginBottom: 0,
            boxSizing: 'border-box',
            width: '100%',
            minWidth: '100%',
            paddingLeft: '2rem',
            borderRadius: '8px',
          })}
        />
      </div>
    </div>
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
            return groups.map(group => {
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
            const sortedCommands = commandsWithGestures.sort((a, b) => a.id.localeCompare(b.id))

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
