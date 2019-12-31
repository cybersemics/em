import React from 'react'
import { connect } from 'react-redux'
import { shortcutById } from '../shortcuts'

const shortcutIds = [
  'indent',
  'outdent',
  'delete',
  'toggleContextView',
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
