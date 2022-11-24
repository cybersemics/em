import React from 'react'
import { useSelector } from 'react-redux'
import GesturePath from '../@types/GesturePath'
import Shortcut from '../@types/Shortcut'
import State from '../@types/State'
import { isTouch } from '../browser'
import { formatKeyboardShortcut, globalShortcuts, shortcutById } from '../shortcuts'
import conjunction from '../util/conjunction'
import keyValueBy from '../util/keyValueBy'
import GestureDiagram from './GestureDiagram'

// define the grouping and ordering of shortcuts
const groups = [
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
      'home',
      'search',
      'openShortcutPopup',
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
      'extract',
    ],
  },
  {
    title: 'Deleting thoughts',
    shortcuts: ['delete', 'archive', 'collapseContext', 'clearThought'],
  },
  {
    title: 'Moving thoughts',
    shortcuts: ['indent', 'outdent', 'bumpThought', 'moveThoughtDown', 'moveThoughtUp'],
  },
  {
    title: 'Editing thoughts',
    shortcuts: ['join', 'splitSentences', 'bold', 'italic', 'underline'],
  },
  {
    title: 'Special Views',
    shortcuts: [
      'note',
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
    shortcuts: ['pin', 'pinChildren', 'toggleDone', 'toggleHiddenThoughts'],
  },
]

// assert that groups include all necessary shortcuts
const shortcutsGroupedMap = keyValueBy(
  groups.flatMap(group => group.shortcuts),
  shortcutId => ({ [shortcutId]: true }),
)
const shortcutsUngrouped = globalShortcuts.filter(
  shortcut =>
    !shortcutsGroupedMap[shortcut.id] &&
    !shortcut.hideFromInstructions &&
    (isTouch ? shortcut.gesture : shortcut.keyboard),
)

if (shortcutsUngrouped.length > 0) {
  throw new Error(
    `ShortcutTable groups are missing shortcut(s). Please add ${conjunction(
      shortcutsUngrouped.map(shortcut => shortcut.id),
    )} to the appropriate group, or add hideFromInstructions: true to the Shortcut.`,
  )
}

/** Renders all of a shortcut's details as a table row. */
const ShortcutRow = (shortcut: Shortcut | null) => {
  const description = useSelector((state: State) => {
    if (!shortcut) return ''
    return typeof shortcut.description === 'function' ? shortcut.description(() => state) : shortcut.description
  })

  return (
    shortcut && (
      <tr key={shortcut.id}>
        <th>
          <b>{shortcut.label}</b>
          <p>{description}</p>
        </th>
        <td>
          {isTouch && shortcut.gesture ? (
            // GesturePath[]
            <GestureDiagram path={shortcut.gesture as GesturePath} size={48} arrowSize={12} />
          ) : shortcut.keyboard ? (
            formatKeyboardShortcut(shortcut.keyboard)
          ) : null}
        </td>
      </tr>
    )
  )
}

/** Renders a table of shortcuts. */
const ShortcutTable = () => {
  return (
    <div style={{ textAlign: 'left' }}>
      {groups.map(group => (
        <div key={group.title}>
          <h2 className='modal-subtitle'>{group.title}</h2>
          <table className='shortcuts'>
            <tbody>
              {group.shortcuts
                .map(shortcutById)
                .filter(shortcut => shortcut && (isTouch ? shortcut.gesture : shortcut.keyboard))
                .map(ShortcutRow)}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

export default ShortcutTable
