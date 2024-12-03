import { FC, useState } from 'react'
import { css } from '../../styled-system/css'
import { modalTextRecipe } from '../../styled-system/recipes'
import Command from '../@types/Command'
import CommandId from '../@types/CommandId'
import { isTouch } from '../browser'
import { commandById, globalCommands } from '../commands'
import useFilteredCommands from '../hooks/useFilteredCommands'
import conjunction from '../util/conjunction'
import keyValueBy from '../util/keyValueBy'
import CommandTableOnly from './CommandTableOnly'

// define the grouping and ordering of shortcuts
const groups: {
  title: string
  shortcuts: CommandId[]
}[] = [
  {
    title: 'Navigation',
    shortcuts: [
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
    shortcuts: [
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
    shortcuts: ['delete', 'archive', 'collapseContext', 'clearThought'],
  },
  {
    title: 'Moving thoughts',
    shortcuts: ['indent', 'outdent', 'bumpThoughtDown', 'moveThoughtDown', 'moveThoughtUp'],
  },
  {
    title: 'Editing thoughts',
    shortcuts: ['join', 'splitSentences', 'bold', 'italic', 'strikethrough', 'underline'],
  },
  {
    title: 'Oops',
    shortcuts: ['undo', 'redo'],
  },
  {
    title: 'Special Views',
    shortcuts: [
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
    shortcuts: ['pin', 'pinAll', 'toggleDone', 'toggleHiddenThoughts'],
  },
  {
    title: 'Settings',
    shortcuts: ['customizeToolbar'],
  },
  {
    title: 'Help',
    shortcuts: ['help'],
  },
]

// assert that groups include all necessary shortcuts
const shortcutsGroupedMap = keyValueBy(
  groups.flatMap(group => group.shortcuts),
  true,
)
const shortcutsUngrouped = globalCommands.filter(
  shortcut =>
    !shortcutsGroupedMap[shortcut.id] && !shortcut.hideFromHelp && (isTouch ? shortcut.gesture : shortcut.keyboard),
)

if (shortcutsUngrouped.length > 0) {
  throw new Error(
    `CommandTable groups are missing shortcut(s). Please add ${conjunction(
      shortcutsUngrouped.map(shortcut => shortcut.id),
    )} to the appropriate group, or add hideFromHelp: true to the Shortcut.`,
  )
}

/** Search bar for filtering shortcuts. */
const SearchShortcut: FC<{
  onInput?: (value: string) => void
}> = ({ onInput }) => {
  return (
    <div id='search' className={css({ borderBottom: 'solid 1px {colors.gray50}' })}>
      <input
        type='text'
        placeholder='Search commands by name...'
        onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
          onInput?.(e.target.value)
        }}
        className={css({
          marginLeft: 0,
          marginBottom: 0,
          marginTop: '1em',
          border: 'none',
          boxSizing: 'border-box',
          width: '100%',
        })}
      />
    </div>
  )
}

/** Renders a group of shortcuts with a heading. */
const ShortcutGroup: ({
  customize,
  onSelect,
  selectedCommand,
  title,
  commands,
  search,
}: {
  customize?: boolean
  onSelect?: (shortcut: Command | null) => void
  selectedCommand?: Command
  title: string
  search?: string
  commands: (Command | null)[]
}) => JSX.Element = ({ customize, onSelect, selectedCommand, commands, title, search }) => {
  const modalClasses = modalTextRecipe()

  return (
    <div>
      <h2 className={modalClasses.subtitle}>{title}</h2>
      <CommandTableOnly
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

/** Renders a table of commands. */
const CommandTable = ({
  customize,
  onSelect,
  selectedCommand: selectedCommand,
}: {
  customize?: boolean
  onSelect?: (command: Command | null) => void
  selectedCommand?: Command
}) => {
  const [search, setSearch] = useState('')
  const commands = useFilteredCommands(search, { platformShortcutsOnly: true })

  return (
    <div>
      <SearchShortcut onInput={setSearch} />
      <div className={css({ textAlign: 'left' })}>
        {search ? (
          <ShortcutGroup
            title={'Results'}
            commands={commands}
            selectedCommand={selectedCommand}
            customize={customize}
            onSelect={onSelect}
            search={search}
          />
        ) : (
          groups.map(group => {
            const commands = group.shortcuts
              .map(commandById)
              .filter((command): command is Command => (isTouch ? !!command.gesture : !!command.keyboard))

            // do not render groups with no shortcuts on this platform
            return commands.length > 0 ? (
              <ShortcutGroup
                title={group.title}
                commands={commands}
                key={group.title}
                customize={customize}
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

export default CommandTable
