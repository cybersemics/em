import React from 'react'
import { isMobile } from '../browser.js'
import { formatKeyboardShortcut, globalShortcuts } from '../shortcuts.js'

// components
import { Helper } from './Helper.js'
import { GestureDiagram } from './GestureDiagram.js'

// util
import {
  makeCompareByProp,
} from '../util.js'

export const HelperShortcuts = () =>
  <Helper id='shortcuts' title={isMobile ? 'Gestures' : 'Shortcuts'} className='popup' center>
    <table className='shortcuts'>
      <tbody>
        {globalShortcuts().concat() // shallow copy for sort
          .sort(makeCompareByProp('name'))
          // filter out shortcuts that do not exist for the current platform
          .filter(shortcut => !shortcut.hideFromInstructions && (isMobile ? shortcut.gesture : shortcut.keyboard))
          .map((shortcut, i) =>
            <tr key={i}>
              <th>
                <b>{shortcut.name}</b>
                <p>{shortcut.description}</p>
              </th>
              <td>{isMobile
                ? <GestureDiagram path={shortcut.gesture} size='24' />
                : formatKeyboardShortcut(shortcut.keyboard)
              }</td>
            </tr>
          )
        }
      </tbody>
    </table>
  </Helper>

