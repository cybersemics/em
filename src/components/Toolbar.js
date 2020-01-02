import React from 'react'
import { connect } from 'react-redux'
import { shortcutById } from '../shortcuts'
import { overlayReveal, overlayHide } from '../action-creators/toolbar'

const shortcutIds = [
  'outdent',
  'indent',
  'delete',
  'toggleContextView',
  'exportContext',
  'search',
]

export const Toolbar = connect(({ settings: { dark } }) => ({ dark }))(({ dark }) =>
  <div className="toolbar">
    {shortcutIds.map(id => {
      const { name, svg: Icon, exec } = shortcutById(id)
      return <div key={id} className="toolbar-icon" title={name} onClick={exec}>
        <Icon fill={dark ? 'white' : 'black'} />
      </div>
    })}
  </div>
)
