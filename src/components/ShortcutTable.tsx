import React from 'react'
import { useSelector } from 'react-redux'
import GesturePath from '../@types/GesturePath'
import Shortcut from '../@types/Shortcut'
import State from '../@types/State'
import { isTouch } from '../browser'
import { formatKeyboardShortcut, globalShortcuts, shortcutById } from '../shortcuts'
import keyValueBy from '../util/keyValueBy'
import makeCompareByProp from '../util/makeCompareByProp'
import sort from '../util/sort'
import GestureDiagram from './GestureDiagram'

// define the grouping and ordering of shortcuts
const groups = [
  {
    title: 'Navigation',
    shortcuts: ['cursorBack', 'cursorForward', 'cursorPrev'],
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
    ],
  },
  {
    title: 'Deleting thoughts',
    shortcuts: ['delete', 'archive', 'collapseContext', 'clearThought'],
  },
  {
    title: 'Moving thoughts',
    shortcuts: ['indent', 'outdent', 'bumpThought'],
  },
  {
    title: 'Special Views',
    shortcuts: ['note', 'toggleContextView', 'proseView', 'toggleTableView'],
  },
]

// get all ungrouped shortcuts to display after the groups
// this is important to ensure that new shortcuts get added to the help modal even if the developer did not add them to a group
// filter out shortcuts that do not exist on the current platform
const shortcutsGroupedMap = keyValueBy(
  groups.flatMap(group => group.shortcuts),
  shortcutId => ({ [shortcutId]: true }),
)
const shortcutsUngrouped = sort(
  globalShortcuts.filter(
    shortcut =>
      !shortcutsGroupedMap[shortcut.id] &&
      !shortcut.hideFromInstructions &&
      (isTouch ? shortcut.gesture : shortcut.keyboard),
  ),
  makeCompareByProp('name'),
)

/** Renders all of a shortcut's details as a table row. */
const ShortcutRow = (shortcut: Shortcut) => {
  const description = useSelector((state: State) =>
    typeof shortcut.description === 'function' ? shortcut.description(() => state) : shortcut.description,
  )

  return (
    <tr key={shortcut.id}>
      <th>
        <b>{shortcut.label}</b>
        <p>{description}</p>
      </th>
      <td>
        {isTouch && shortcut.gesture ? (
          // GesturePath[]
          <GestureDiagram path={shortcut.gesture as GesturePath} size={48} />
        ) : shortcut.keyboard ? (
          formatKeyboardShortcut(shortcut.keyboard)
        ) : null}
      </td>
    </tr>
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
              {group.shortcuts.map(shortcutId => {
                const shortcut = shortcutById(shortcutId)
                if (!shortcut) {
                  throw new Error(`Invalid shortcut id: ${shortcutId}`)
                }
                return ShortcutRow(shortcut)
              })}
            </tbody>
          </table>
        </div>
      ))}

      {shortcutsUngrouped.length > 0 && (
        <div>
          <h2 className='modal-subtitle'>Other</h2>
          <table className='shortcuts'>
            <tbody>{shortcutsUngrouped.map(ShortcutRow)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ShortcutTable
