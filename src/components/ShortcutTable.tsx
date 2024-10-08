import { FC } from 'react'
import { modalText } from '../../styled-system/recipes'
import Shortcut from '../@types/Shortcut'
import ShortcutId from '../@types/ShortcutId'
import { isTouch } from '../browser'
import useShortcut from '../hooks/useShortcut'
import { globalShortcuts, shortcutById } from '../shortcuts'
import conjunction from '../util/conjunction'
import keyValueBy from '../util/keyValueBy'
import ShortcutTableOnly from './ShortcutTableOnly'
import ShortcutRow from './ShortcutRow'
import { css } from '../../styled-system/css'
// import { useStore } from "react-redux"
// import { sortShortcuts } from "../util/sortShortcut";


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
console.log(shortcutsGroupedMap)

if (shortcutsUngrouped.length > 0) {
  throw new Error(
    `ShortcutTable groups are missing shortcut(s). Please add ${conjunction(
      shortcutsUngrouped.map(shortcut => shortcut.id),
    )} to the appropriate group, or add hideFromHelp: true to the Shortcut.`,
  )
}

/**
 *
 */
const SearchShortcut: FC<{
  onInput?: (value: string) => void
}> = ({ onInput }) => {
  return (
    <div id='search' style={{ borderBottom: 'solid 1px gray' }}>
      <input
        type='text'
        placeholder='Search commands by name...'
        // ref={inputRef}
        onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
          onInput?.(e.target.value)
        }}
        style={{
          marginLeft: 0,
          marginBottom: 0,
          marginTop: '1em',
          border: 'none',
          boxSizing: 'border-box',
          width: '100%',
        }}
      />
    </div>
  )
}

const ShortcutGroup: ({
  customize,
  onSelect,
  selectedShortcut,
}: {
  customize?: boolean
  onSelect?: (shortcut: Shortcut | null) => void
  selectedShortcut?: Shortcut
}) => JSX.Element = ({ customize, onSelect, selectedShortcut }) => {
  const modalClasses = modalText()

  return (
    <>
    {
      groups.map(group => {
        const shortcuts = group.shortcuts
          .map(shortcutById)
          .filter((shortcut): shortcut is Shortcut => (isTouch ? !!shortcut.gesture : !!shortcut.keyboard))

        // do not render groups with no shrotcuts on this platform
        if (shortcuts.length === 0) return null

        return (
          <div key={group.title}>
            <h2 className={modalClasses.subtitle}>{group.title}</h2>
            <ShortcutTableOnly
              shortcuts={shortcuts}
              selectedShortcut={selectedShortcut}
              customize={customize}
              onSelect={onSelect}
              applyIndexInToolbar
            />
          </div>
        )
      })
    }
    </>
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
  const { setKeyboardInProgress, keyboardInProgress, possibleShortcutsSorted } = useShortcut({
    includeRecentCommand: false,
  })
  const modalClasses = modalText()

  return (
    <div>
      <SearchShortcut onInput={setKeyboardInProgress} />
      <div style={{ textAlign: 'left' }}>
        {
          keyboardInProgress ? (
            <>
              <h2 className={modalClasses.subtitle}>Results:</h2>
              <table className={css({ fontSize: '14px' })} style={{ marginTop: '2rem' }}>
                <tbody>
                  {possibleShortcutsSorted.map(shortcut => {
                    return (
                      <ShortcutRow
                        key={shortcut?.id}
                        shortcut={shortcut}
                        onSelect={onSelect}
                        selected={selectedShortcut && shortcut.id === selectedShortcut.id}
                        keyboardInProgress={keyboardInProgress}
                      />
                    )
                  })}
                </tbody>
              </table>
            </>
          ) : (
            <ShortcutGroup customize={customize} onSelect={onSelect} selectedShortcut={selectedShortcut} />
          )
        }
      </div>
    </div>
  )
}

export default ShortcutTable
