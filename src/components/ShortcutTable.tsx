import React from 'react'
import { useSelector } from 'react-redux'
import GesturePath from '../@types/GesturePath'
import Shortcut from '../@types/Shortcut'
import State from '../@types/State'
import { isTouch } from '../browser'
import { formatKeyboardShortcut, globalShortcuts } from '../shortcuts'
import makeCompareByProp from '../util/makeCompareByProp'
import sort from '../util/sort'
import GestureDiagram from './GestureDiagram'

/** Renders all of a shortcut's details as a table row. */
const ShortcutRow = (shortcut: Shortcut, i: number) => {
  const description = useSelector((state: State) =>
    typeof shortcut.description === 'function' ? shortcut.description(() => state) : shortcut.description,
  )
  return (
    <tr key={i}>
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
  // filter out shortcuts that do not exist on the current platform
  const shortcuts = sort(globalShortcuts, makeCompareByProp('name')).filter(
    shortcut => !shortcut.hideFromInstructions && (isTouch ? shortcut.gesture : shortcut.keyboard),
  )

  return (
    <table className='shortcuts'>
      <tbody>{shortcuts.map(ShortcutRow)}</tbody>
    </table>
  )
}

export default ShortcutTable
