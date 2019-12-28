import React from 'react'
import { connect } from 'react-redux'
import { shortcutById } from '../shortcuts'
import Icon from './Icon'

const shortcutIds = [
    'search',
    'bindContext',
    'subcategorizeOne',
    'subcategorizeAll',
    'newUncle',
    'toggleProseView',
]

const toolBar = () => {
    return <div className="toolbar">
        { shortcutIds.map(id => {
            //  console.log(shortcutById(id))
            const { name, svg, exec } = shortcutById(id)
            return <Icon key = { id } svg={ svg } onclick={ exec } id={ id } text={ name } />
        })}
    </div>
}

export const Toolbar = connect()(toolBar)
