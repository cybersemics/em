import React from 'react'
import { shortcutById } from '../shortcuts'

const shortcutIds = [
  'search',
  'bindContext',
  'subcategorizeOne',
  'subcategorizeAll',
  'newUncle',
  'toggleProseView',
]

export const Toolbar = () => {
  return <div className="toolbar">
    {shortcutIds.map(id => {
      const { name, svg, exec } = shortcutById(id)
      return <div key={id} className="toolbar-icon" title={name} onClick={exec}>{svg}</div>
    })}
  </div>
}
