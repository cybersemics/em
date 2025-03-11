import { FC, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { modalTextRecipe } from '../../styled-system/recipes'
import Command from '../@types/Command'
import CommandId from '../@types/CommandId'
import { isTouch } from '../browser'
import { commandById, globalCommands } from '../commands'
import useFilteredCommands from '../hooks/useFilteredCommands'
import theme from '../selectors/theme'
import conjunction from '../util/conjunction'
import keyValueBy from '../util/keyValueBy'
import CommandGridOnly from './CommandGridOnly'
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

// assert that groups include all necessary commands
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
const SearchCommands: FC<{
  onInput?: (value: string) => void
}> = ({ onInput }) => {
  const isLightTheme = useSelector(state => theme(state) === 'Light')

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: '5px',
      })}
    >
      <div id='search' className={css({ flexGrow: 1, border: 'solid 1px {colors.gray50}', borderRadius: '8px' })}>
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
            backgroundImage: isLightTheme ? 'url("/assets/search_light.svg")' : 'url("/assets/search.svg")',
            backgroundSize: '16px',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: '10px center',
            borderRadius: '8px',
          })}
        />
      </div>
      <SortButton onSortChange={() => {}} />
    </div>
  )
}

/** Renders a group of commands with a heading. */
const CommandsGroup: ({
  customize,
  onSelect,
  selectedCommand,
  title,
  commands,
  search,
}: {
  customize?: boolean
  onSelect?: (command: Command | null) => void
  selectedCommand?: Command
  title: string
  search?: string
  commands: (Command | null)[]
}) => JSX.Element = ({ customize, onSelect, selectedCommand, commands, title, search }) => {
  const modalClasses = modalTextRecipe()

  return (
    <div>
      <h2
        className={css({
          ...modalClasses,
          fontSize: '1.3rem',
          borderBottom: 'none',
          position: 'sticky',
          top: '-1.5rem',
          background: 'linear-gradient(to bottom, {colors.bg} 85%, transparent)',
          padding: '0.5rem 0',
          zIndex: 1,
        })}
      >
        {title}
      </h2>
      <CommandGridOnly
        commands={commands}
        selectedCommand={selectedCommand}
        customize={customize}
        onSelect={onSelect}
        search={search}
        applyIndexInToolbar
      />
    </div>
  )
}

/** Renders a grid of commands. */
const CommandGrid = ({
  customize,
  onSelect,
  selectedCommand: selectedCommand,
}: {
  customize?: boolean
  onSelect?: (command: Command | null) => void
  selectedCommand?: Command
}) => {
  const [search, setSearch] = useState('')
  const commands = useFilteredCommands(search, { platformCommandsOnly: true })

  return (
    <div>
      <SearchCommands onInput={setSearch} />
      <div className={css({ textAlign: 'left' })}>
        {search ? (
          <CommandsGroup
            title={'Results'}
            commands={commands}
            selectedCommand={selectedCommand}
            customize={customize}
            onSelect={onSelect}
            search={search}
          />
        ) : (
          groups.map(group => {
            const commands = group.commands
              .map(commandById)
              .filter((command): command is Command => (isTouch ? !!command.gesture : !!command.keyboard))

            // do not render groups with no commands on this platform
            return commands.length > 0 ? (
              <CommandsGroup
                title={group.title}
                commands={commands}
                customize={customize}
                key={group.title}
                onSelect={onSelect}
                selectedCommand={selectedCommand}
              />
            ) : null
          })
        )}
      </div>
    </div>
  )
}

export default CommandGrid
