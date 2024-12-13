import { FC, useState } from 'react'
import { css } from '../../styled-system/css'
import { modalText } from '../../styled-system/recipes'
import Shortcut from '../@types/Shortcut'
import ShortcutId from '../@types/ShortcutId'
import { isTouch } from '../browser'
import useFilteredCommands from '../hooks/useFilteredCommands'
import { globalShortcuts, shortcutById } from '../shortcuts'
import conjunction from '../util/conjunction'
import keyValueBy from '../util/keyValueBy'
import ShortcutTableOnly from './ShortcutTableOnly'

// define the grouping and ordering of shortcuts
const groups: {
  title: string
  shortcuts: ShortcutId[]
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
const shortcutsUngrouped = globalShortcuts.filter(
  shortcut =>
    !shortcutsGroupedMap[shortcut.id] && !shortcut.hideFromHelp && (isTouch ? shortcut.gesture : shortcut.keyboard),
)

if (shortcutsUngrouped.length > 0) {
  throw new Error(
    `ShortcutTable groups are missing shortcut(s). Please add ${conjunction(
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
  selectedShortcut,
  title,
  shortcuts,
  search,
}: {
  customize?: boolean
  onSelect?: (shortcut: Shortcut | null) => void
  selectedShortcut?: Shortcut
  title: string
  search?: string
  shortcuts: (Shortcut | null)[]
}) => JSX.Element = ({ customize, onSelect, selectedShortcut, shortcuts, title, search }) => {
  const modalClasses = modalText()

  return (
    <div>
      <h2 className={modalClasses.subtitle}>{title}</h2>
      <ShortcutTableOnly
        shortcuts={shortcuts}
        selectedShortcut={selectedShortcut}
        customize={customize}
        onSelect={onSelect}
        search={search}
        applyIndexInToolbar
      />
    </div>
  )
}

/** Renders a table of shortcuts. */
const ShortcutTable = ({
  customize,
  onSelect,
  selectedShortcut,
}: {
  customize?: boolean
  onSelect?: (shortcut: Shortcut | null) => void
  selectedShortcut?: Shortcut
}) => {
  const [search, setSearch] = useState('')
  const shortcuts = useFilteredCommands(search, { platformShortcutsOnly: true })

  return (
    <div>
      <SearchShortcut onInput={setSearch} />
      <div className={css({ textAlign: 'left' })}>
        {search ? (
          <ShortcutGroup
            title={'Results'}
            shortcuts={shortcuts}
            selectedShortcut={selectedShortcut}
            customize={customize}
            onSelect={onSelect}
            search={search}
          />
        ) : (
          groups.map(group => {
            const shortcuts = group.shortcuts
              .map(shortcutById)
              .filter((shortcut): shortcut is Shortcut => (isTouch ? !!shortcut.gesture : !!shortcut.keyboard))

            // do not render groups with no shortcuts on this platform
            return shortcuts.length > 0 ? (
              <ShortcutGroup
                title={group.title}
                shortcuts={shortcuts}
                key={group.title}
                customize={customize}
                onSelect={onSelect}
                selectedShortcut={selectedShortcut}
              />
            ) : null
          })
        )}
      </div>
    </div>
  )
}

export default ShortcutTable
