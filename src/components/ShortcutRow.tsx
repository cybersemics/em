import React, { FC } from 'react'
import { useSelector } from 'react-redux'
import GesturePath from '../@types/GesturePath'
import Shortcut from '../@types/Shortcut'
import State from '../@types/State'
import { isTouch } from '../browser'
import { formatKeyboardShortcut } from '../shortcuts'
import GestureDiagram from './GestureDiagram'

/** Renders all of a shortcut's details as a table row. */
const ShortcutRow: FC<{ shortcut: Shortcut | null }> = ({ shortcut }) => {
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

export default ShortcutRow
